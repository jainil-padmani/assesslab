
import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, FileCheck, FileUp, Trash2, FileText, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Check if OCR text exists in storage or cache
  const checkOcrStatus = async () => {
    try {
      // Check if question paper OCR text exists
      const questionResponse = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', file.question_paper_url)
        .single();

      if (questionResponse.data?.ocr_text) {
        setQuestionOcrText(questionResponse.data.ocr_text);
      }

      // Check if answer key OCR text exists
      const answerResponse = await supabase
        .from('subject_documents')
        .select('ocr_text')
        .eq('document_url', file.answer_key_url)
        .single();

      if (answerResponse.data?.ocr_text) {
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
            <div className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors">
              <a 
                href={file.question_paper_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center flex-1"
              >
                <FilePlus className="h-5 w-5 mr-2 text-primary" />
                <div>
                  <div className="text-sm font-medium">Question Paper</div>
                  <div className="text-xs text-muted-foreground">View document</div>
                </div>
              </a>
              {questionOcrText ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOcrQuestionDialog(true)}
                  className="ml-2"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  OCR Text
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => processOcr(file.question_paper_url, 'question')}
                  disabled={loadingOcrQuestion}
                  className="ml-2"
                >
                  <FileSearch className="h-4 w-4 mr-1" />
                  {loadingOcrQuestion ? 'Processing...' : 'Extract Text'}
                </Button>
              )}
            </div>
            
            {file.answer_key_url && (
              <div className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors">
                <a 
                  href={file.answer_key_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center flex-1"
                >
                  <FileCheck className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Answer Key</div>
                    <div className="text-xs text-muted-foreground">View document</div>
                  </div>
                </a>
                {answerOcrText ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOcrAnswerDialog(true)}
                    className="ml-2"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    OCR Text
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => processOcr(file.answer_key_url, 'answer')}
                    disabled={loadingOcrAnswer}
                    className="ml-2"
                  >
                    <FileSearch className="h-4 w-4 mr-1" />
                    {loadingOcrAnswer ? 'Processing...' : 'Extract Text'}
                  </Button>
                )}
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

      {/* OCR Text Preview Dialogs */}
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
    </>
  );
}
