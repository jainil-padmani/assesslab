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
import { FilePlus, FileCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Subject, SubjectFile } from "@/types/dashboard";
import { deleteFileGroup } from "@/utils/subjectFilesUtils";

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

  const uploadSubjectPaper = async () => {
    if (!subject.id || !topic.trim() || !questionPaper || !answerKey) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploadingPaper(true);

    try {
      const questionPaperUrl = await uploadFile(questionPaper, 'questionPaper');
      
      const answerKeyUrl = await uploadFile(answerKey, 'answerKey');
      
      toast.success("Files uploaded successfully!");
      
      setTopic("");
      setQuestionPaper(null);
      setAnswerKey(null);
      setOpenUploadDialog(false);
      
      fetchSubjectFiles();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsUploadingPaper(false);
    }
  };

  const uploadFile = async (file: File, fileType: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedTopic = topic.replace(/\s+/g, '_');
      const fileName = `${subject.id}_${sanitizedTopic}_${fileType}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      throw error;
    }
  };

  const handleDeleteFile = async (file: SubjectFile) => {
    try {
      const { data: storageFiles, error: listError } = await supabase
        .storage
        .from('files')
        .list();
        
      if (listError) throw listError;
      
      const groupPrefix = `${file.subject_id}_${file.topic}_`;
      const filesToDelete = storageFiles?.filter(storageFile => 
        storageFile.name.startsWith(groupPrefix)
      ) || [];
        
      for (const storageFile of filesToDelete) {
        const { error: deleteError } = await supabase
          .storage
          .from('files')
          .remove([storageFile.name]);
            
        if (deleteError) throw deleteError;
      }

      toast.success("Files deleted successfully");
      fetchSubjectFiles();
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
                Add a question paper and its answer key for this subject.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
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
                  Question Paper
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
                  Answer Key
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
            </div>
            
            <DialogFooter>
              <Button
                type="submit"
                onClick={uploadSubjectPaper}
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
                      variant="ghost" 
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
