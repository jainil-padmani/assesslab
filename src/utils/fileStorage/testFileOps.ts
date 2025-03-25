
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import type { SubjectFile, TestFile } from "@/types/dashboard";

/**
 * Assigns existing subject files to a test by creating a copy in the test_files table
 */
export const assignSubjectFilesToTest = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<boolean> => {
  try {
    // Create a new entry in the test_files table with data from the subject file
    const { error } = await supabase.from('test_files').insert({
      id: uuidv4(),
      test_id: testId,
      topic: subjectFile.topic,
      question_paper_url: subjectFile.question_paper_url,
      answer_key_url: subjectFile.answer_key_url,
      handwritten_paper_url: null,
      created_at: new Date().toISOString()
    });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error assigning files to test:", error);
    return false;
  }
};

/**
 * Fetches test files from the database
 */
export const fetchTestFiles = async (testId: string): Promise<TestFile[]> => {
  try {
    const { data, error } = await supabase
      .from('test_files')
      .select('*')
      .eq('test_id', testId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching test files:", error);
    return [];
  }
};
