
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTestPapersData } from "./test/useTestPapersData";
import { useTestPaperAssignment } from "./test/useTestPaperAssignment";
import { useTestFileDeletion } from "./test/useTestFileDeletion";
import type { Test } from "@/types/tests";

export function useTestPapers(
  test: Test & { subjects: { name: string, subject_code: string } }, 
  refreshTrigger: number = 0
) {
  const queryClient = useQueryClient();
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  
  // Use the data fetching hook
  const papersData = useTestPapersData(test, refreshTrigger);
  
  // Use the file assignment hook
  const { isUploading, assignExistingPaper } = useTestPaperAssignment(
    test, 
    papersData.subjectFiles,
    {
      refreshStorage: papersData.refreshStorage,
      refetchTestFiles: papersData.refetchTestFiles,
      refetchSubjectFiles: papersData.refetchSubjectFiles,
      triggerLocalRefresh: papersData.triggerLocalRefresh
    }
  );
  
  // Use the file deletion hook
  const { handleDeleteFile } = useTestFileDeletion({
    refreshStorage: papersData.refreshStorage,
    refetchTestFiles: papersData.refetchTestFiles,
    refetchSubjectFiles: papersData.refetchSubjectFiles,
    triggerLocalRefresh: papersData.triggerLocalRefresh
  });

  // Force refresh when the refreshTrigger changes
  useEffect(() => {
    const refreshData = async () => {
      try {
        console.log("Refreshing data due to trigger change:", papersData.combinedRefreshTrigger);
        
        // Force refresh storage before refetching
        await papersData.refreshStorage();
        
        // Invalidate queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["testFiles"] });
        queryClient.invalidateQueries({ queryKey: ["subjectFiles"] });
        
        // Refetch both test files and subject files
        await Promise.all([papersData.refetchTestFiles(), papersData.refetchSubjectFiles()]);
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    };
    
    if (papersData.combinedRefreshTrigger > 0) {
      refreshData();
    }
  }, [papersData.combinedRefreshTrigger, papersData.refetchTestFiles, papersData.refetchSubjectFiles, queryClient, papersData.refreshStorage]);

  // Explicit function to force a complete refresh
  const forceCompleteRefresh = async () => {
    console.log("Forcing complete refresh of test papers data");
    
    // Reset the refresh trigger to force a UI update
    papersData.triggerLocalRefresh();
    
    // Wait briefly before refreshing storage
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force refresh storage
    await papersData.refreshStorage();
    
    // Invalidate all related queries
    queryClient.invalidateQueries();
    
    // Explicitly refetch both test files and subject files
    await Promise.all([papersData.refetchTestFiles(), papersData.refetchSubjectFiles()]);
    
    console.log("Complete refresh finished");
  };

  return {
    // Data
    testFiles: papersData.testFiles,
    subjectFiles: papersData.subjectFiles,
    
    // Loading states
    isUploading,
    isLoading: papersData.isTestFilesLoading || papersData.isSubjectFilesLoading,
    
    // UI state
    openUploadDialog,
    setOpenUploadDialog,
    
    // Operations
    assignExistingPaper,
    handleDeleteFile,
    
    // Refresh functions
    refetchTestFiles: papersData.refetchTestFiles,
    refetchSubjectFiles: papersData.refetchSubjectFiles,
    refreshStorage: papersData.refreshStorage,
    forceCompleteRefresh
  };
}
