
import { useState, useEffect, useCallback } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Optimized fetch function with rate limiting
  const fetchTestPapers = useCallback(async () => {
    // Rate limit: Don't fetch more than once every 5 seconds
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      console.log('Skipping fetch due to rate limiting');
      return;
    }
    
    setIsLoading(true);
    try {
      if (!selectedTest) {
        setTestFiles([]);
        return;
      }
      
      console.log('Fetching test files for:', selectedTest);
      const files = await fetchTestFiles(selectedTest);
      setTestFiles(files);
      setLastFetchTime(now);
    } catch (error: any) {
      console.error('Error fetching test papers:', error);
      toast.error('Failed to fetch test papers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTest, lastFetchTime]);

  // Fetch files when selectedTest changes
  useEffect(() => {
    if (selectedTest) {
      fetchTestPapers();
    } else {
      setTestFiles([]);
    }
  }, [selectedTest, fetchTestPapers]);

  return { testFiles, isLoading, fetchTestPapers };
}
