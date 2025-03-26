
import React, { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface TestPapersProps {
  test: Test & { subjects: { name: string, subject_code: string } };
}

export function TestPapersManagement({ test }: TestPapersProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const {
    testFiles,
    subjectFiles,
    isUploading,
    isLoading,
    openUploadDialog,
    setOpenUploadDialog,
    assignExistingPaper,
    handleDeleteFile
  } = useTestPapers(test, refreshTrigger);

  // Force refresh when component mounts
  useEffect(() => {
    // Trigger a refresh
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleAssignPaper = async (fileId: string) => {
    try {
      if (!fileId) {
        toast.error("No file selected");
        return;
      }
      
      const selectedFile = subjectFiles?.find(file => file.id === fileId);
      if (!selectedFile) {
        toast.error("Selected file not found");
        return;
      }
      
      await assignExistingPaper(fileId);
      
      // Close the dialog and trigger a refresh
      setOpenUploadDialog(false);
      setRefreshTrigger(prev => prev + 1);
      
      toast.success("Paper successfully assigned to test");
    } catch (error) {
      console.error("Error assigning paper:", error);
      toast.error("Failed to assign paper to test");
    }
  };

  const handleDeleteTestPaper = async (file: any) => {
    try {
      await handleDeleteFile(file);
      // Trigger a refresh after deletion
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error deleting test paper:", error);
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
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : !testFiles || testFiles.length === 0 ? (
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
                onDelete={handleDeleteTestPaper} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
