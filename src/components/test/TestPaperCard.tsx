
import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, FileCheck, FileUp, Trash2, FileText, FileSearch, Edit, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestFile {
  id: string;
  test_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

interface TestPaperCardProps {
  file: TestFile;
  onDelete: (file: TestFile) => void;
}

export function TestPaperCard({ file, onDelete }: TestPaperCardProps) {
  const [loadingOcrQuestion, setLoadingOcrQuestion] = useState(false);
  const [loadingOcrAnswer, setLoadingOcrAnswer] = useState(false);
  const [questionOcrText, setQuestionOcrText] = useState<string | null>(null);
  const [answerOcrText, setAnswerOcrText] = useState<string | null>(null);
  const [showOcrQuestionDialog, setShowOcrQuestionDialog] = useState(false);
  const [showOcrAnswerDialog, setShowOcrAnswerDialog] = useState(false);
  
  // New states for direct text entry
  const [editingQuestionText, setEditingQuestionText] = useState(false);
  const [editingAnswerText, setEditingAnswerText] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");
  const [savingQuestionText, setSavingQuestionText] = useState(false);
  const [savingAnswerText, setSavingAnswerText] = useState(false);

  // Check if OCR text exists in storage or cache
  const checkOcrStatus = async () => {
    try {
      // Check if question paper OCR text exists
      const questionResponse = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', file.question_paper_url)
        .single();

      if (questionResponse.data && questionResponse.data.ocr_text) {
        setQuestionOcrText(questionResponse.data.ocr_text);
      }

      // Check if answer key OCR text exists
      const answerResponse = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', file.answer_key_url)
        .single();

      if (answerResponse.data && answerResponse.data.ocr_text) {
        setAnswerOcrText(answerResponse.data.ocr_text);
      }
    } catch (error) {
      console.error("Error checking OCR status:", error);
    }
  };

  // Load OCR status on component mount
  React.useEffect(() => {
    checkOcrStatus();
  }, [file]);

  const processOcr = async (fileUrl: string, fileType: string) => {
    try {
      // Set loading state based on file type
      if (fileType === 'question') {
        setLoadingOcrQuestion(true);
      } else {
        setLoadingOcrAnswer(true);
      }

      // Extract file name from URL for logging
      const fileName = fileUrl.split('/').pop() || 'unknown';
      
      // Call the extract-text function to process the file
      const response = await supabase.functions.invoke('extract-text', {
        body: {
          fileUrl,
          fileName,
          fileType: fileType === 'question' ? 'questionPaper' : 'answerKey',
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process OCR');
      }

      const extractedText = response.data?.text;
      
      if (!extractedText) {
        throw new Error('No text extracted from document');
      }

      // Store the OCR text in database
      const updateResponse = await supabase
        .from('subject_documents')
        .update({ ocr_text: extractedText })
        .eq('document_url', fileUrl);

      if (updateResponse.error) {
        console.error("Error storing OCR text:", updateResponse.error);
      }

      // Update state with extracted text
      if (fileType === 'question') {
        setQuestionOcrText(extractedText);
        toast.success('Question paper OCR processing completed');
      } else {
        setAnswerOcrText(extractedText);
        toast.success('Answer key OCR processing completed');
      }

    } catch (error) {
      console.error(`Error processing ${fileType} OCR:`, error);
      toast.error(`Failed to process ${fileType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Reset loading state
      if (fileType === 'question') {
        setLoadingOcrQuestion(false);
      } else {
        setLoadingOcrAnswer(false);
      }
    }
  };

  // Function to handle direct text entry for question paper
  const handleSaveQuestionText = async () => {
    if (!newQuestionText.trim()) {
      toast.error('Please enter some text for the question paper');
      return;
    }

    try {
      setSavingQuestionText(true);
      
      // Check if document record exists
      const { data: existingDoc, error: checkError } = await supabase
        .from('subject_documents')
        .select('id')
        .eq('document_url', file.question_paper_url)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingDoc) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('subject_documents')
          .update({ ocr_text: newQuestionText })
          .eq('document_url', file.question_paper_url);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('subject_documents')
          .insert({
            document_url: file.question_paper_url,
            document_type: 'questionPaper',
            file_name: file.question_paper_url.split('/').pop() || 'manual-entry',
            file_type: 'text/plain',
            file_size: newQuestionText.length,
            ocr_text: newQuestionText
          });

        if (insertError) throw insertError;
      }

      // Update local state
      setQuestionOcrText(newQuestionText);
      setEditingQuestionText(false);
      toast.success('Question paper text saved successfully');
    } catch (error) {
      console.error('Error saving question text:', error);
      toast.error(`Failed to save question text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingQuestionText(false);
    }
  };

  // Function to handle direct text entry for answer key
  const handleSaveAnswerText = async () => {
    if (!newAnswerText.trim()) {
      toast.error('Please enter some text for the answer key');
      return;
    }

    try {
      setSavingAnswerText(true);
      
      // Check if document record exists
      const { data: existingDoc, error: checkError } = await supabase
        .from('subject_documents')
        .select('id')
        .eq('document_url', file.answer_key_url)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingDoc) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('subject_documents')
          .update({ ocr_text: newAnswerText })
          .eq('document_url', file.answer_key_url);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('subject_documents')
          .insert({
            document_url: file.answer_key_url,
            document_type: 'answerKey',
            file_name: file.answer_key_url.split('/').pop() || 'manual-entry',
            file_type: 'text/plain',
            file_size: newAnswerText.length,
            ocr_text: newAnswerText
          });

        if (insertError) throw insertError;
      }

      // Update local state
      setAnswerOcrText(newAnswerText);
      setEditingAnswerText(false);
      toast.success('Answer key text saved successfully');
    } catch (error) {
      console.error('Error saving answer text:', error);
      toast.error(`Failed to save answer text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingAnswerText(false);
    }
  };

  const startEditingQuestionText = () => {
    setNewQuestionText(questionOcrText || '');
    setEditingQuestionText(true);
  };

  const startEditingAnswerText = () => {
    setNewAnswerText(answerOcrText || '');
    setEditingAnswerText(true);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 py-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base truncate" title={file.topic}>
              {file.topic}
            </CardTitle>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onDelete(file)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex flex-col p-2 border rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <a 
                  href={file.question_paper_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <FilePlus className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Question Paper</div>
                    <div className="text-xs text-muted-foreground">View document</div>
                  </div>
                </a>
                <div className="flex space-x-2">
                  {questionOcrText ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOcrQuestionDialog(true)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        OCR Text
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={startEditingQuestionText}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => processOcr(file.question_paper_url, 'question')}
                        disabled={loadingOcrQuestion}
                      >
                        <FileSearch className="h-4 w-4 mr-1" />
                        {loadingOcrQuestion ? 'Processing...' : 'Extract Text'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingQuestionText(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Enter Text
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {file.answer_key_url && (
              <div className="flex flex-col p-2 border rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <a 
                    href={file.answer_key_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <FileCheck className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <div className="text-sm font-medium">Answer Key</div>
                      <div className="text-xs text-muted-foreground">View document</div>
                    </div>
                  </a>
                  <div className="flex space-x-2">
                    {answerOcrText ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowOcrAnswerDialog(true)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          OCR Text
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startEditingAnswerText}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processOcr(file.answer_key_url, 'answer')}
                          disabled={loadingOcrAnswer}
                        >
                          <FileSearch className="h-4 w-4 mr-1" />
                          {loadingOcrAnswer ? 'Processing...' : 'Extract Text'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingAnswerText(true)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Enter Text
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {file.handwritten_paper_url && (
              <a 
                href={file.handwritten_paper_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
              >
                <FileUp className="h-5 w-5 mr-2 text-primary" />
                <div>
                  <div className="text-sm font-medium">Handwritten Paper</div>
                  <div className="text-xs text-muted-foreground">View document</div>
                </div>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OCR Text Preview Dialog for Question Paper */}
      <Dialog open={showOcrQuestionDialog} onOpenChange={setShowOcrQuestionDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Question Paper OCR Text</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4 bg-muted/30 text-sm whitespace-pre-wrap">
            {questionOcrText || "No text available"}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* OCR Text Preview Dialog for Answer Key */}
      <Dialog open={showOcrAnswerDialog} onOpenChange={setShowOcrAnswerDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Answer Key OCR Text</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full rounded-md border p-4 bg-muted/30 text-sm whitespace-pre-wrap">
            {answerOcrText || "No text available"}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Text Entry Dialog for Question Paper */}
      <Dialog open={editingQuestionText} onOpenChange={setEditingQuestionText}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Enter Question Paper Text</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-2">
              <Textarea 
                value={newQuestionText} 
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Enter the text of the question paper here..."
                className="h-[50vh] text-sm"
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-2">
              <ScrollArea className="h-[50vh] w-full rounded-md border p-4 bg-muted/30 text-sm whitespace-pre-wrap">
                {newQuestionText || "No preview available. Please enter some text."}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditingQuestionText(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestionText}
              disabled={savingQuestionText || !newQuestionText.trim()}
            >
              {savingQuestionText ? 'Saving...' : 'Save Text'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Text Entry Dialog for Answer Key */}
      <Dialog open={editingAnswerText} onOpenChange={setEditingAnswerText}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Enter Answer Key Text</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-2">
              <Textarea 
                value={newAnswerText} 
                onChange={(e) => setNewAnswerText(e.target.value)}
                placeholder="Enter the text of the answer key here..."
                className="h-[50vh] text-sm"
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-2">
              <ScrollArea className="h-[50vh] w-full rounded-md border p-4 bg-muted/30 text-sm whitespace-pre-wrap">
                {newAnswerText || "No preview available. Please enter some text."}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEditingAnswerText(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAnswerText}
              disabled={savingAnswerText || !newAnswerText.trim()}
            >
              {savingAnswerText ? 'Saving...' : 'Save Text'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
