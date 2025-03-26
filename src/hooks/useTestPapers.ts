
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export function useTestPapers(test: Test & { subjects: { name: string, subject_code: string } }) {
  const [isUploading, setIsUploading] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);

  // Fetch existing test files
  const { data: testFiles, refetch: refetchTestFiles } = useQuery({
    queryKey: ["testFiles", test.id],
    queryFn: () => fetchTestFiles(test.id),
    staleTime: 30000 // Data is considered fresh for 30 seconds
  });

  // Fetch subject files that could be assigned to this test
  const { data: subjectFiles, refetch: refetchSubjectFiles } = useQuery({
    queryKey: ["subjectFiles", test.subject_id],
    queryFn: () => fetchSubjectFiles(test.subject_id),
    staleTime: 30000 // Data is considered fresh for 30 seconds
  });

  const assignExistingPaper = async (fileId: string) => {
    if (!fileId) {
      toast.error("Please select a file to assign");
      return;
    }

    setIsUploading(true);
    
    try {
      console.log("Assigning file to test:", fileId);
      const fileToAssign = subjectFiles?.find(file => file.id === fileId);
      
      if (!fileToAssign) {
        throw new Error("Selected file not found");
      }
      
      // Validate file has question paper and answer key
      if (!fileToAssign.question_paper_url || !fileToAssign.answer_key_url) {
        throw new Error("Selected file must have both question paper and answer key");
      }
      
      const success = await assignSubjectFilesToTest(test.id, fileToAssign);
      
      if (success) {
        // Force refresh storage before refetching
        await forceRefreshStorage();
        
        // Refetch both test files and subject files to ensure we have the latest data
        await refetchTestFiles();
        await refetchSubjectFiles();
        
        setOpenUploadDialog(false);
        return true;
      } else {
        throw new Error("Failed to assign file to test");
      }
    } catch (error: any) {
      console.error("Error assigning files:", error);
      toast.error(`Failed to assign files: ${error.message}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: TestFile) => {
    try {
      toast.info("Deleting file...");
      const testPrefix = `test_${file.test_id}`;
      const success = await deleteFileGroup(testPrefix, file.topic);
      
      if (success) {
        // Force refresh storage before refetching
        await forceRefreshStorage();
        
        // Refetch both test files and subject files
        await refetchTestFiles();
        await refetchSubjectFiles();
        
        toast.success("Files deleted successfully");
        return true;
      } else {
        throw new Error("Failed to delete files");
      }
    } catch (error: any) {
      console.error("Error deleting files:", error);
      toast.error(`Failed to delete files: ${error.message}`);
      return false;
    }
  };

  return {
    testFiles,
    subjectFiles,
    isUploading,
    openUploadDialog,
    setOpenUploadDialog,
    assignExistingPaper,
    handleDeleteFile,
    refetchTestFiles
  };
}
