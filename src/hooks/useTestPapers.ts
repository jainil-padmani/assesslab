
import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  fetchSubjectFiles, 
  assignSubjectFilesToTest, 
  fetchTestFiles,
  deleteFileGroup
} from "@/utils/subjectFilesUtils";
import { forceRefreshStorage } from "@/utils/fileStorage/storageHelpers";
import type { Test } from "@/types/tests";
import type { SubjectFile } from "@/types/dashboard";

interface TestFile {
  id: string;
  test_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

export function useTestPapers(test: Test & { subjects: { name: string, subject_code: string } }, refreshTrigger: number = 0) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  
  // Combine external refresh trigger with local one
  const combinedRefreshTrigger = refreshTrigger + localRefreshTrigger;

  // Force refresh storage function
  const refreshStorage = useCallback(async () => {
    console.log("Forcibly refreshing storage");
    try {
      await forceRefreshStorage();
      console.log("Storage refresh completed");
    } catch (error) {
      console.error("Error during storage refresh:", error);
    }
  }, []);

  // Fetch existing test files
  const { 
    data: testFiles, 
    refetch: refetchTestFiles,
    isLoading: isTestFilesLoading
  } = useQuery({
    queryKey: ["testFiles", test.id, combinedRefreshTrigger],
    queryFn: async () => {
      console.log('Fetching test files for test ID:', test.id, 'with trigger:', combinedRefreshTrigger);
      
      // Force refresh storage to ensure we have the latest files
      await refreshStorage();
      
      const files = await fetchTestFiles(test.id);
      console.log('Fetched test files:', files);
      return files;
    },
    staleTime: 0, // Always refetch to ensure we have the latest data
    retry: 2,     // Retry twice in case of temporary storage issues
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Fetch subject files that could be assigned to this test
  const { 
    data: subjectFiles, 
    refetch: refetchSubjectFiles,
    isLoading: isSubjectFilesLoading
  } = useQuery({
    queryKey: ["subjectFiles", test.subject_id, combinedRefreshTrigger],
    queryFn: async () => {
      console.log('Fetching subject files for subject ID:', test.subject_id, 'with trigger:', combinedRefreshTrigger);
      
      // Force refresh storage to ensure we have the latest files
      await refreshStorage();
      
      const files = await fetchSubjectFiles(test.subject_id);
      console.log('Fetched subject files:', files);
      return files;
    },
    staleTime: 0, // Always refetch to ensure we have the latest data
    retry: 2,     // Retry twice in case of temporary storage issues
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Force refresh when the refreshTrigger changes
  useEffect(() => {
    const refreshData = async () => {
      try {
        console.log("Refreshing data due to trigger change:", combinedRefreshTrigger);
        
        // Force refresh storage before refetching
        await refreshStorage();
        
        // Invalidate queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["testFiles"] });
        queryClient.invalidateQueries({ queryKey: ["subjectFiles"] });
        
        // Refetch both test files and subject files
        await Promise.all([refetchTestFiles(), refetchSubjectFiles()]);
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    };
    
    if (combinedRefreshTrigger > 0) {
      refreshData();
    }
  }, [combinedRefreshTrigger, refetchTestFiles, refetchSubjectFiles, queryClient, refreshStorage]);

  const assignExistingPaper = async (fileId: string) => {
    if (!fileId) {
      toast.error("Please select a file to assign");
      return false;
    }

    setIsUploading(true);
    
    try {
      const fileToAssign = subjectFiles?.find(file => file.id === fileId);
      
      if (!fileToAssign) {
        throw new Error("Selected file not found");
      }
      
      console.log("Starting file assignment process for:", fileToAssign.topic);
      const success = await assignSubjectFilesToTest(test.id, fileToAssign);
      
      if (success) {
        console.log("Assignment reported as successful, refreshing data");
        toast.success("Files assigned successfully!");
        
        // Wait briefly before refreshing to allow storage operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force refresh storage before refetching
        await refreshStorage();
        
        // Trigger a local refresh to update the UI
        setLocalRefreshTrigger(prev => prev + 1);
        
        // Invalidate queries with wide scope to ensure cache is cleared
        queryClient.invalidateQueries();
        
        // Specifically refetch the test files with a delay to ensure storage is updated
        setTimeout(async () => {
          console.log("Performing delayed refetch of test files");
          await refetchTestFiles();
        }, 1500);
        
        return true;
      }
      
      return success;
    } catch (error: any) {
      console.error("Error assigning files:", error);
      toast.error("Failed to assign files: " + (error.message || "Unknown error"));
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: TestFile) => {
    try {
      const testPrefix = `test_${file.test_id}`;
      const success = await deleteFileGroup(testPrefix, file.topic);
      
      if (success) {
        toast.success("Files deleted successfully");
        
        // Force refresh storage before refetching
        await refreshStorage();
        
        // Trigger a local refresh to update the UI
        setLocalRefreshTrigger(prev => prev + 1);
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["testFiles"] });
        queryClient.invalidateQueries({ queryKey: ["subjectFiles"] });
        
        // Refetch both test files and subject files
        await refetchTestFiles();
        await refetchSubjectFiles();
      }
      
      return success;
    } catch (error: any) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files: " + (error.message || "Unknown error"));
      return false;
    }
  };

  // Explicit function to force a complete refresh
  const forceCompleteRefresh = useCallback(async () => {
    console.log("Forcing complete refresh of test papers data");
    
    // Reset the refresh trigger to force a UI update
    setLocalRefreshTrigger(prev => prev + 1);
    
    // Wait briefly before refreshing storage
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Force refresh storage
    await refreshStorage();
    
    // Invalidate all related queries
    queryClient.invalidateQueries();
    
    // Explicitly refetch both test files and subject files
    await Promise.all([refetchTestFiles(), refetchSubjectFiles()]);
    
    console.log("Complete refresh finished");
  }, [queryClient, refreshStorage, refetchTestFiles, refetchSubjectFiles]);

  return {
    testFiles,
    subjectFiles,
    isUploading,
    isLoading: isTestFilesLoading || isSubjectFilesLoading,
    openUploadDialog,
    setOpenUploadDialog,
    assignExistingPaper,
    handleDeleteFile,
    refetchTestFiles,
    refetchSubjectFiles,
    refreshStorage,
    forceCompleteRefresh
  };
}
