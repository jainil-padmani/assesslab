
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FilePlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { SubjectFile } from "@/types/dashboard";

interface TestPaperAssignDialogProps {
  testId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subjectFiles: SubjectFile[] | undefined;
  isUploading: boolean;
  onAssignPaper: (fileId: string) => Promise<void>;
}

export function TestPaperAssignDialog({
  testId,
  isOpen,
  onOpenChange,
  subjectFiles,
  isUploading,
  onAssignPaper
}: TestPaperAssignDialogProps) {
  const [selectedExistingFile, setSelectedExistingFile] = useState<string | null>(null);
  const [validSubjectFiles, setValidSubjectFiles] = useState<SubjectFile[]>([]);

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedExistingFile(null);
    }
  }, [isOpen]);

  // Filter out files that don't have answer keys
  useEffect(() => {
    if (subjectFiles) {
      console.log("Filtering subject files for valid papers:", subjectFiles);
      const validFiles = subjectFiles.filter(file => file.question_paper_url && file.answer_key_url);
      setValidSubjectFiles(validFiles);
      console.log("Valid subject files:", validFiles);
      
      // Reset selection if the selected file is no longer valid
      if (selectedExistingFile && !validFiles.some(file => file.id === selectedExistingFile)) {
        setSelectedExistingFile(null);
      }
    }
  }, [subjectFiles, selectedExistingFile]);

  const handleAssignPaper = async () => {
    if (!selectedExistingFile) {
      toast.error("Please select a paper to assign");
      return;
    }
    
    const selectedFile = validSubjectFiles.find(file => file.id === selectedExistingFile);
    
    if (!selectedFile?.answer_key_url) {
      toast.error("Selected file does not have an answer key, which is required");
      return;
    }
    
    try {
      console.log("Assigning paper with ID:", selectedExistingFile);
      await onAssignPaper(selectedExistingFile);
      // Reset selection after successful assignment
      setSelectedExistingFile(null);
    } catch (error) {
      console.error("Error during paper assignment:", error);
      toast.error("Failed to assign paper. Please try again.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <FilePlus className="mr-2 h-4 w-4" />
          Add Papers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Papers to Test</DialogTitle>
          <DialogDescription>
            Assign existing subject papers to this test.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2 rounded-md bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div className="text-sm">
              Note: Only papers with both question papers and answer keys are shown. Answer keys are now required.
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="existing-file">Select Subject Paper</Label>
            <Select 
              value={selectedExistingFile || ""} 
              onValueChange={setSelectedExistingFile}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a paper" />
              </SelectTrigger>
              <SelectContent>
                {validSubjectFiles && validSubjectFiles.length > 0 ? (
                  validSubjectFiles.map(file => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.topic}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No subject papers with answer keys available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedExistingFile && (
            <div className="border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium mb-1">
                Selected Paper: {validSubjectFiles?.find(f => f.id === selectedExistingFile)?.topic}
              </p>
              <p className="text-xs text-muted-foreground">
                This will create a copy of the selected paper and its answer key for this test.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleAssignPaper}
            disabled={isUploading || !selectedExistingFile}
          >
            {isUploading ? 'Assigning...' : 'Assign Papers'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
