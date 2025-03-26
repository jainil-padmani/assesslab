
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
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  // Optimized fetch function with rate limiting
  const fetchTestPapers = useCallback(async (force = false) => {
    // Rate limit: Don't fetch more than once every 5 seconds unless forced
    const now = Date.now();
    if (!force && now - lastFetchTime < 5000) {
      console.log('Skipping fetch due to rate limiting');
      return;
    }
    
    if (!selectedTest) {
      console.log('No test selected, skipping fetch');
      setTestFiles([]);
      return;
    }
    
    setIsLoading(true);
    try {      
      console.log('Fetching test files for test ID:', selectedTest);
      const files = await fetchTestFiles(selectedTest);
      
      // Log detailed information about the fetched files
      console.log(`Fetched ${files.length} test files:`, 
        files.map(f => ({
          id: f.id,
          topic: f.topic,
          hasQuestionPaper: !!f.question_paper_url,
          hasAnswerKey: !!f.answer_key_url
        }))
      );
      
      setTestFiles(files);
      setLastFetchTime(now);
      setIsInitialFetchDone(true);
    } catch (error: any) {
      console.error('Error fetching test papers:', error);
      toast.error('Failed to fetch test papers: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedTest, lastFetchTime]);

  // Fetch files when selectedTest changes
  useEffect(() => {
    // Only do initial fetch if we have a test selected and haven't done the initial fetch yet
    if (selectedTest && !isInitialFetchDone) {
      console.log('Initial fetch for test ID:', selectedTest);
      fetchTestPapers(true); // Force fetch on initial load
    } else if (!selectedTest) {
      // Reset state when test is deselected
      setTestFiles([]);
      setIsInitialFetchDone(false);
    }
  }, [selectedTest, fetchTestPapers, isInitialFetchDone]);

  return { 
    testFiles, 
    isLoading, 
    fetchTestPapers,
    isInitialFetchDone
  };
}
