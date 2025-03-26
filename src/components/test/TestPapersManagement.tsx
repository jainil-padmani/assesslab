
import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, RefreshCw, Upload } from "lucide-react";
import type { Test } from "@/types/tests";
import { useTestPapers } from "@/hooks/useTestPapers";
import { TestPaperCard } from "./TestPaperCard";
import { TestPaperAssignDialog } from "./TestPaperAssignDialog";
import { TestPaperUploadDialog } from "./TestPaperUploadDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface TestPapersProps {
  test: Test & { subjects: { name: string, subject_code: string } };
}

export function TestPapersManagement({ test }: TestPapersProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [openUploadPaperDialog, setOpenUploadPaperDialog] = useState(false);
  
  const {
    testFiles,
    subjectFiles,
    isUploading,
    isLoading,
    openUploadDialog,
    setOpenUploadDialog,
    assignExistingPaper,
    handleDeleteFile,
    forceCompleteRefresh
  } = useTestPapers(test, refreshTrigger);

  // Initial load to fetch the test papers data
  const refreshData = useCallback(async () => {
    try {
      console.log("Refreshing test papers for test ID:", test.id);
      await forceCompleteRefresh();
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  }, [test.id, forceCompleteRefresh]);

  useEffect(() => {
    refreshData();
    
    // Set up a periodic refresh every 10 seconds for a minute to ensure files are loaded
    const intervalId = setInterval(() => {
      console.log("Periodic refresh of test papers");
      refreshData();
    }, 10000);
    
    // Clear the interval after 1 minute
    setTimeout(() => {
      clearInterval(intervalId);
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [test.id, refreshData]);

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log("Manual refresh triggered");
      
      setRefreshTrigger(prev => prev + 1);
      
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
      toast.info("Assigning paper, please wait...");
      
      const success = await assignExistingPaper(fileId);
      
      if (success) {
        setOpenUploadDialog(false);
        toast.success("Paper successfully assigned to test");
        
        // Force a complete refresh after assignment
        await forceCompleteRefresh();
        
        // Trigger another refresh after a delay to ensure the files are loaded
        setTimeout(async () => {
          setRefreshTrigger(prev => prev + 1);
          await forceCompleteRefresh();
        }, 3000);
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
      toast.info("Removing test paper...");
      const success = await handleDeleteFile(file);
      if (success) {
        toast.success("Test paper removed successfully");
        await forceCompleteRefresh();
      } else {
        toast.error("Failed to remove test paper");
      }
    } catch (error) {
      console.error("Error deleting test paper:", error);
      toast.error("Failed to remove test paper");
    }
  };

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
          
          <Button
            variant="outline"
            onClick={() => setOpenUploadPaperDialog(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Papers
          </Button>
          
          <TestPaperAssignDialog
            testId={test.id}
            isOpen={openUploadDialog}
            onOpenChange={setOpenUploadDialog}
            subjectFiles={subjectFiles}
            isUploading={isUploading}
            onAssignPaper={handleAssignPaper}
          />
          
          <TestPaperUploadDialog
            testId={test.id}
            isOpen={openUploadPaperDialog}
            onOpenChange={setOpenUploadPaperDialog}
            onSuccess={() => {
              refreshData();
              setTimeout(() => refreshData(), 3000);
            }}
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
            <p className="text-muted-foreground mb-4">No papers uploaded yet for this test.</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setOpenUploadPaperDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Papers
              </Button>
              <Button variant="outline" onClick={() => setOpenUploadDialog(true)}>
                <FilePlus className="mr-2 h-4 w-4" />
                Assign Existing Papers
              </Button>
            </div>
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
