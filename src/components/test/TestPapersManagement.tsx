
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, RefreshCw } from "lucide-react";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    testFiles,
    subjectFiles,
    isUploading,
    isLoading,
    openUploadDialog,
    setOpenUploadDialog,
    assignExistingPaper,
    handleDeleteFile,
    refetchTestFiles,
    refreshStorage,
    forceCompleteRefresh
  } = useTestPapers(test, refreshTrigger);

  // Force refresh when component mounts and also on refreshTrigger change
  useEffect(() => {
    const refreshData = async () => {
      console.log("Initial test papers refresh for test ID:", test.id);
      await forceCompleteRefresh();
    };
    
    refreshData();
  }, [test.id, forceCompleteRefresh]);

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log("Manual refresh triggered");
      
      // Increment refresh trigger to force component update
      setRefreshTrigger(prev => prev + 1);
      
      // Explicitly force a complete refresh
      await forceCompleteRefresh();
      
      toast.success("Files refreshed successfully");
    } catch (error) {
      console.error("Error during manual refresh:", error);
      toast.error("Failed to refresh files");
    } finally {
      setIsRefreshing(false);
    }
  };

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
      
      console.log("Assigning paper:", selectedFile);
      const success = await assignExistingPaper(fileId);
      
      if (success) {
        // Close the dialog
        setOpenUploadDialog(false);
        
        // Show success message
        toast.success("Paper successfully assigned to test");
        
        // Log current state
        console.log("Paper assigned successfully. Current test files:", testFiles);
        
        // Force a refresh after a slight delay to ensure storage is updated
        setTimeout(async () => {
          await forceCompleteRefresh();
        }, 2000);
      } else {
        toast.error("Failed to assign paper to test");
      }
    } catch (error) {
      console.error("Error assigning paper:", error);
      toast.error("Failed to assign paper to test");
    }
  };

  const handleDeleteTestPaper = async (file: any) => {
    try {
      const success = await handleDeleteFile(file);
      if (success) {
        // Force refresh after deletion
        await forceCompleteRefresh();
      }
    } catch (error) {
      console.error("Error deleting test paper:", error);
    }
  };

  // Debug log to check if files are being displayed
  useEffect(() => {
    console.log("Current test files:", testFiles);
  }, [testFiles]);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Test Papers</CardTitle>
          <CardDescription>Manage question papers and answer keys for this test</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <TestPaperAssignDialog
            testId={test.id}
            isOpen={openUploadDialog}
            onOpenChange={setOpenUploadDialog}
            subjectFiles={subjectFiles}
            isUploading={isUploading}
            onAssignPaper={handleAssignPaper}
          />
        </div>
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
