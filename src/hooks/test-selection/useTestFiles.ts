
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchTestFiles } from "@/utils/subjectFilesUtils";

export interface TestFile {
  id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
}

export function useTestFiles(selectedTest: string) {
  const [testFiles, setTestFiles] = useState<TestFile[]>([]);

  useEffect(() => {
    if (selectedTest) {
      fetchTestPapers();
    } else {
      setTestFiles([]);
    }
  }, [selectedTest]);

  const fetchTestPapers = async () => {
    try {
      if (!selectedTest) return [];
      
      const files = await fetchTestFiles(selectedTest);
      setTestFiles(files);
      return files;
    } catch (error: any) {
      toast.error('Failed to fetch test papers');
      console.error('Error fetching test papers:', error);
      return [];
    }
  };

  return { testFiles, fetchTestPapers };
}
