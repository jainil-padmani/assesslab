
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { forceRefreshStorage } from "../storageHelpers";
import { mapTestFiles } from "../mappers";

/**
 * Fetches test files for a specific test ID
 * 
 * @param testId The ID of the test to fetch files for
 * @returns Array of test files
 */
export const fetchTestFiles = async (testId: string): Promise<any[]> => {
  try {
    console.log('Fetching test files for test ID:', testId);
    
    // Force a refresh to ensure we get the latest files
    await forceRefreshStorage();
    
    // Verify test exists and get ownership info
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('user_id, subject_id')
      .eq('id', testId)
      .single();
      
    if (testError) throw testError;
    
    // Get all files from storage
    const storageData = await listStorageFiles();

    // Map the files to test files
    const filesMap = mapTestFiles(storageData, testId);
    
    // Filter to include files with at least a question paper and answer key
    const files = Object.values(filesMap).filter(
      file => file.question_paper_url && file.answer_key_url
    );
    
    console.log("Fetched test files:", files.length);
    return files;
  } catch (error) {
    console.error('Error fetching test files:', error);
    toast.error('Failed to fetch test files');
    return [];
  }
};

// Re-export helper function to avoid circular dependencies
const listStorageFiles = async () => {
  const { listStorageFiles } = await import('../storageHelpers');
  return listStorageFiles();
};
