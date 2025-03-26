
import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import type { Test } from "@/types/tests";
import { useTestPapers } from "@/hooks/useTestPapers";
import { TestPaperCard } from "./TestPaperCard";
import { TestPaperAssignDialog } from "./TestPaperAssignDialog";

interface TestPapersProps {
  test: Test & { subjects: { name: string, subject_code: string } };
  onPapersChanged?: () => void;
}

export function TestPapersManagement({ test, onPapersChanged }: TestPapersProps) {
  const {
    testFiles,
    subjectFiles,
    isUploading,
    openUploadDialog,
    setOpenUploadDialog,
    assignExistingPaper,
    handleDeleteFile,
    refetchTestFiles
  } = useTestPapers(test);

  // Ensure UI updates when papers are changed
  useEffect(() => {
    if (testFiles && onPapersChanged) {
      onPapersChanged();
    }
  }, [testFiles, onPapersChanged]);

  const handleAssignPaper = async (fileId: string) => {
    await assignExistingPaper(fileId);
    // Notify parent component after successful paper assignment
    if (onPapersChanged) {
      onPapersChanged();
    }
  };

  const handleDeleteTestFile = async (file: any) => {
    await handleDeleteFile(file);
    // Notify parent component after successful deletion
    if (onPapersChanged) {
      onPapersChanged();
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Test Papers</CardTitle>
          <CardDescription>Manage question papers and answer keys for this test</CardDescription>
        </div>
        <TestPaperAssignDialog
          testId={test.id}
          isOpen={openUploadDialog}
          onOpenChange={setOpenUploadDialog}
          subjectFiles={subjectFiles}
          isUploading={isUploading}
          onAssignPaper={handleAssignPaper}
        />
      </CardHeader>
      
      <CardContent>
        {!testFiles || testFiles.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No papers uploaded yet for this test.</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpenUploadDialog(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              Add Papers
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testFiles.map((file) => (
              <TestPaperCard 
                key={file.id} 
                file={file} 
                onDelete={handleDeleteTestFile}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
