
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assignSubjectFilesToTest } from "@/utils/fileStorage/testFiles";
import type { Test } from "@/types/tests";
import type { SubjectFile } from "@/types/dashboard";

/**
 * Hook for handling test paper assignment operations
 */
export function useTestPaperAssignment(
  test: Test & { subjects: { name: string, subject_code: string } },
  subjectFiles: SubjectFile[] | undefined,
  refreshFunctions: {
    refreshStorage: () => Promise<void>;
    refetchTestFiles: () => Promise<any>;
    refetchSubjectFiles: () => Promise<any>;
    triggerLocalRefresh: () => void;
  }
) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const { refreshStorage, refetchTestFiles, refetchSubjectFiles, triggerLocalRefresh } = refreshFunctions;

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
        triggerLocalRefresh();
        
        // Invalidate ALL queries to ensure cache is cleared completely
        queryClient.invalidateQueries();
        
        // Set a chain of delayed refreshes to ensure storage is updated
        const refreshAtIntervals = async () => {
          for (let i = 1; i <= 3; i++) {
            setTimeout(async () => {
              console.log(`Performing delayed refetch #${i} of test files`);
              await refreshStorage();
              await refetchTestFiles();
            }, i * 1500);
          }
        };
        
        refreshAtIntervals();
        
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

  return {
    isUploading,
    assignExistingPaper
  };
}
