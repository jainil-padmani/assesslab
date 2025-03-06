
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  fetchSubjectFiles, 
  assignSubjectFilesToTest, 
  fetchTestFiles,
  deleteFileGroup
} from "@/utils/subjectFilesUtils";
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
    queryFn: () => fetchTestFiles(test.id)
  });

  // Fetch subject files that could be assigned to this test
  const { data: subjectFiles } = useQuery({
    queryKey: ["subjectFiles", test.subject_id],
    queryFn: () => fetchSubjectFiles(test.subject_id)
  });

  const assignExistingPaper = async (fileId: string) => {
    if (!fileId) {
      toast.error("Please select a file to assign");
      return;
    }

    setIsUploading(true);
    
    try {
      const fileToAssign = subjectFiles?.find(file => file.id === fileId);
      
      if (!fileToAssign) {
        throw new Error("Selected file not found");
      }
      
      const success = await assignSubjectFilesToTest(test.id, fileToAssign);
      
      if (success) {
        toast.success("Files assigned successfully!");
        setOpenUploadDialog(false);
        refetchTestFiles();
      }
    } catch (error) {
      console.error("Error assigning files:", error);
      toast.error("Failed to assign files. Please try again.");
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
        refetchTestFiles();
      }
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files");
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
