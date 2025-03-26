
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteFileGroup } from "@/utils/fileStorage/subjectFileOps";

interface TestFile {
  id: string;
  test_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

/**
 * Hook for handling test file deletion operations
 */
export function useTestFileDeletion(
  refreshFunctions: {
    refreshStorage: () => Promise<void>;
    refetchTestFiles: () => Promise<any>;
    refetchSubjectFiles: () => Promise<any>;
    triggerLocalRefresh: () => void;
  }
) {
  const queryClient = useQueryClient();
  const { refreshStorage, refetchTestFiles, refetchSubjectFiles, triggerLocalRefresh } = refreshFunctions;

  const handleDeleteFile = async (file: TestFile) => {
    try {
      const testPrefix = `test_${file.test_id}`;
      const success = await deleteFileGroup(testPrefix, file.topic);
      
      if (success) {
        toast.success("Files deleted successfully");
        
        // Force refresh storage before refetching
        await refreshStorage();
        
        // Trigger a local refresh to update the UI
        triggerLocalRefresh();
        
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

  return {
    handleDeleteFile
  };
}
