
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
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false);

  useEffect(() => {
    if (selectedTest) {
      // Reset flag when test changes
      setHasInitiallyFetched(false);
      fetchTestPapers();
    } else {
      setTestFiles([]);
    }
  }, [selectedTest]);

  const fetchTestPapers = async () => {
    try {
      if (!selectedTest) return [];
      
      console.log("Fetching test papers for test:", selectedTest);
      const files = await fetchTestFiles(selectedTest);
      setTestFiles(files);
      setHasInitiallyFetched(true);
      return files;
    } catch (error: any) {
      toast.error('Failed to fetch test papers');
      console.error('Error fetching test papers:', error);
      return [];
    }
  };

  return { testFiles, fetchTestPapers, hasInitiallyFetched };
}
