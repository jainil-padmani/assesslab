
import React, { useState } from "react";
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
import { FilePlus } from "lucide-react";
import type { SubjectFile } from "@/types/dashboard";

interface TestPaperAssignDialogProps {
  testId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subjectFiles: SubjectFile[] | undefined;
  isUploading: boolean;
  onAssignPaper: (fileId: string, questionPaperOnly: boolean) => Promise<void>;
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

  const handleAssignPaper = async () => {
    if (selectedExistingFile) {
      // Always pass false for questionPaperOnly now that we're removing this option
      await onAssignPaper(selectedExistingFile, false);
      setSelectedExistingFile(null);
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
          <div className="text-sm text-muted-foreground mb-4">
            Assign both question paper and answer key to this test.
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
                {subjectFiles && subjectFiles.length > 0 ? (
                  subjectFiles.map(file => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.topic}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No subject papers available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedExistingFile && (
            <div className="border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium mb-1">
                Selected Paper: {subjectFiles?.find(f => f.id === selectedExistingFile)?.topic}
              </p>
              <p className="text-xs text-muted-foreground">
                This will create a copy of the selected paper for this test.
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
