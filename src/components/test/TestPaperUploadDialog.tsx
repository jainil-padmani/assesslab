
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileUp, Loader2 } from "lucide-react";
import { forceRefreshStorage } from "@/utils/fileStorage/storageHelpers";

interface TestPaperUploadDialogProps {
  testId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TestPaperUploadDialog({ 
  testId, 
  isOpen, 
  onOpenChange,
  onSuccess
}: TestPaperUploadDialogProps) {
  const [topicName, setTopicName] = useState("");
  const [questionPaperFile, setQuestionPaperFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleReset = () => {
    setTopicName("");
    setQuestionPaperFile(null);
    setAnswerKeyFile(null);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    try {
      if (!topicName.trim()) {
        toast.error("Please enter a topic name");
        return;
      }

      if (!questionPaperFile) {
        toast.error("Please select a question paper file");
        return;
      }

      if (!answerKeyFile) {
        toast.error("Please select an answer key file");
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);

      // Sanitize topic name for file naming
      const sanitizedTopic = topicName.trim().replace(/\s+/g, '_').toLowerCase();
      const timestamp = Date.now();
      
      // Upload question paper
      setUploadProgress(30);
      const questionPaperPath = `test_${testId}_${sanitizedTopic}_questionPaper_${timestamp}`;
      const { error: questionPaperError, data: qpData } = await supabase.storage
        .from('files')
        .upload(questionPaperPath, questionPaperFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (questionPaperError) {
        throw new Error(`Failed to upload question paper: ${questionPaperError.message}`);
      }

      // Upload answer key
      setUploadProgress(60);
      const answerKeyPath = `test_${testId}_${sanitizedTopic}_answerKey_${timestamp}`;
      const { error: answerKeyError, data: akData } = await supabase.storage
        .from('files')
        .upload(answerKeyPath, answerKeyFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (answerKeyError) {
        throw new Error(`Failed to upload answer key: ${answerKeyError.message}`);
      }

      setUploadProgress(90);
      
      // Force refresh storage
      await forceRefreshStorage();
      
      setUploadProgress(100);
      toast.success("Test papers uploaded successfully");
      
      // Dispatch a global event for test file upload
      const event = new CustomEvent('testFileUploaded', {
        detail: {
          testId,
          topic: topicName,
          questionPaperPath,
          answerKeyPath
        }
      });
      document.dispatchEvent(event);
      
      // Reset form and close dialog
      handleReset();
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error uploading test papers:", error);
      toast.error(error.message || "Failed to upload test papers");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleReset();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Test Papers</DialogTitle>
          <DialogDescription>
            Upload question paper and answer key directly for this test.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="topic-name">Topic Name</Label>
            <Input
              id="topic-name"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="Enter a topic name for this paper"
              disabled={isUploading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="question-paper">Question Paper</Label>
            <div className="flex items-center gap-2">
              <Input
                id="question-paper"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setQuestionPaperFile(e.target.files?.[0] || null)}
                disabled={isUploading}
                className="flex-1"
              />
              {questionPaperFile && (
                <span className="text-xs text-muted-foreground">
                  {(questionPaperFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="answer-key">Answer Key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="answer-key"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAnswerKeyFile(e.target.files?.[0] || null)}
                disabled={isUploading}
                className="flex-1"
              />
              {answerKeyFile && (
                <span className="text-xs text-muted-foreground">
                  {(answerKeyFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              )}
            </div>
          </div>

          {isUploading && (
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !topicName || !questionPaperFile || !answerKeyFile}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
