
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  const [selectedQuestionPaperOnly, setSelectedQuestionPaperOnly] = useState<boolean>(false);

  const handleAssignPaper = async () => {
    if (selectedExistingFile) {
      await onAssignPaper(selectedExistingFile, selectedQuestionPaperOnly);
      setSelectedExistingFile(null);
      setSelectedQuestionPaperOnly(false);
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
          <Tabs defaultValue="full" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="full" 
                onClick={() => setSelectedQuestionPaperOnly(false)}
              >
                Full Paper Set
              </TabsTrigger>
              <TabsTrigger 
                value="question" 
                onClick={() => setSelectedQuestionPaperOnly(true)}
              >
                Question Paper Only
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="full" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Assign both question paper and answer key to this test.
              </div>
            </TabsContent>
            
            <TabsContent value="question" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Assign only the question paper to this test.
              </div>
            </TabsContent>
          </Tabs>

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
                {selectedQuestionPaperOnly 
                  ? "This will create a copy of just the question paper for this test."
                  : "This will create a copy of the selected paper for this test."}
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
            {isUploading ? 'Assigning...' : selectedQuestionPaperOnly 
              ? 'Assign Question Paper' 
              : 'Assign Papers'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
