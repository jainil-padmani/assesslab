
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { forceRefreshStorage } from "@/utils/fileStorage/storageHelpers";
import { fetchTestFiles } from "@/utils/fileStorage/testFiles";
import { fetchSubjectFiles } from "@/utils/fileStorage/subjectFileOps";
import type { Test } from "@/types/tests";

/**
 * Hook for fetching test and subject files data
 */
export function useTestPapersData(
  test: Test & { subjects: { name: string, subject_code: string } },
  refreshTrigger: number = 0
) {
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  
  // Combine external refresh trigger with local one
  const combinedRefreshTrigger = refreshTrigger + localRefreshTrigger;

  // Force refresh storage function
  const refreshStorage = async () => {
    console.log("Forcibly refreshing storage");
    try {
      await forceRefreshStorage();
      console.log("Storage refresh completed");
    } catch (error) {
      console.error("Error during storage refresh:", error);
    }
  };

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

  return {
    testFiles,
    subjectFiles,
    isTestFilesLoading,
    isSubjectFilesLoading,
    refetchTestFiles,
    refetchSubjectFiles,
    refreshStorage,
    triggerLocalRefresh: () => setLocalRefreshTrigger(prev => prev + 1),
    combinedRefreshTrigger
  };
}
