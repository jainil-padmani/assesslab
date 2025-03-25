
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { FilePlus, FileCheck, FileUp, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Subject, SubjectFile } from "@/types/dashboard";
import { uploadSubjectFile, deleteFileGroup } from "@/utils/subjectFilesUtils";

interface PapersManagementProps {
  subject: Subject;
  subjectFiles: SubjectFile[];
  fetchSubjectFiles: () => Promise<void>;
}

export function PapersManagement({ subject, subjectFiles, fetchSubjectFiles }: PapersManagementProps) {
  const [isUploadingPaper, setIsUploadingPaper] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [topic, setTopic] = useState("");
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [handwrittenPaper, setHandwrittenPaper] = useState<File | null>(null);

  const handleUploadPaper = async () => {
    if (!subject.id || !topic.trim() || !questionPaper) {
      toast.error("Please provide a topic and upload a question paper");
      return;
    }

    if (!answerKey) {
      toast.error("Answer key is now required. Please upload an answer key file");
      return;
    }

    setIsUploadingPaper(true);

    try {
      // Verify that the current user owns this subject
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload files");
      }
      
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('user_id')
        .eq('id', subject.id)
        .single();
        
      if (!subjectData || subjectData.user_id !== user.id) {
        throw new Error("You don't have permission to upload files to this subject");
      }
      
      const sanitizedTopic = topic.replace(/\s+/g, '_');
      
      // Upload question paper (required)
      if (questionPaper) {
        await uploadSubjectFile(subject.id, sanitizedTopic, questionPaper, 'questionPaper');
      }
      
      // Upload answer key (required)
      if (answerKey) {
        await uploadSubjectFile(subject.id, sanitizedTopic, answerKey, 'answerKey');
      }
      
      // Upload handwritten paper (optional)
      if (handwrittenPaper) {
        await uploadSubjectFile(subject.id, sanitizedTopic, handwrittenPaper, 'handwrittenPaper');
      }
      
      toast.success("Files uploaded successfully!");
      
      setTopic("");
      setQuestionPaper(null);
      setAnswerKey(null);
      setHandwrittenPaper(null);
      setOpenUploadDialog(false);
      
      fetchSubjectFiles();
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(`Failed to upload files: ${error.message}`);
    } finally {
      setIsUploadingPaper(false);
    }
  };

  const handleDeleteFile = async (file: SubjectFile) => {
    try {
      // Verify ownership before deletion
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to delete files");
        return;
      }
      
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('user_id')
        .eq('id', subject.id)
        .single();
        
      if (!subjectData || subjectData.user_id !== user.id) {
        toast.error("You don't have permission to delete files from this subject");
        return;
      }
      
      // Extract prefix and topic from file.id
      const parts = file.id.split('_');
      if (parts.length >= 2) {
        const prefix = parts[0];
        const topic = parts[1];
        const success = await deleteFileGroup(prefix, topic);
        
        if (success) {
          fetchSubjectFiles();
        }
      } else {
        toast.error("Invalid file identifier");
      }
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Subject Papers</CardTitle>
          <CardDescription>Manage question papers and answer keys for this subject</CardDescription>
        </div>
        <Dialog open={openUploadDialog} onOpenChange={setOpenUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <FilePlus className="mr-2 h-4 w-4" />
              Add Papers
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Subject Papers</DialogTitle>
              <DialogDescription>
                Add a question paper with a required answer key for this subject.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2 rounded-md bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div className="text-sm">
                  Answer keys are now required when uploading papers.
                </div>
              </div>
            
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="topic" className="text-right">
                  Topic
                </Label>
                <Input
                  id="topic"
                  className="col-span-3"
                  placeholder="Enter topic or title"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="question-paper" className="text-right">
                  Question Paper <span className="text-xs text-red-500">*</span>
                </Label>
                <div className="col-span-3">
                  <Input
                    id="question-paper"
                    type="file"
                    accept=".pdf,.docx,.png,.jpeg,.jpg"
                    onChange={(e) => setQuestionPaper(e.target.files?.[0] || null)}
                  />
                  {questionPaper && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {questionPaper.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="answer-key" className="text-right">
                  Answer Key <span className="text-xs text-red-500">*</span>
                </Label>
                <div className="col-span-3">
                  <Input
                    id="answer-key"
                    type="file"
                    accept=".pdf,.docx,.png,.jpeg,.jpg"
                    onChange={(e) => setAnswerKey(e.target.files?.[0] || null)}
                  />
                  {answerKey && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {answerKey.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="handwritten-paper" className="text-right">
                  Handwritten Paper
                  <span className="text-xs text-muted-foreground"> (Optional)</span>
                </Label>
                <div className="col-span-3">
                  <Input
                    id="handwritten-paper"
                    type="file"
                    accept=".pdf,.png,.jpeg,.jpg"
                    onChange={(e) => setHandwrittenPaper(e.target.files?.[0] || null)}
                  />
                  {handwrittenPaper && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {handwrittenPaper.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleUploadPaper}
                disabled={isUploadingPaper || !topic.trim() || !questionPaper || !answerKey}
              >
                {isUploadingPaper ? 'Uploading...' : 'Upload Papers'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {subjectFiles.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No papers uploaded yet for this subject.</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpenUploadDialog(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              Add Your First Paper
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subjectFiles.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base truncate" title={file.topic}>
                      {file.topic}
                    </CardTitle>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDeleteFile(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <a 
                      href={file.question_paper_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <FilePlus className="h-5 w-5 mr-2 text-primary" />
                      <div>
                        <div className="text-sm font-medium">Question Paper</div>
                        <div className="text-xs text-muted-foreground">View document</div>
                      </div>
                    </a>
                    
                    {file.answer_key_url && (
                      <a 
                        href={file.answer_key_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <FileCheck className="h-5 w-5 mr-2 text-primary" />
                        <div>
                          <div className="text-sm font-medium">Answer Key</div>
                          <div className="text-xs text-muted-foreground">View document</div>
                        </div>
                      </a>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
