
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";

/**
 * Verifies test ownership and subject file validity
 * 
 * @param testId The test ID to verify
 * @param subjectFile The subject file to verify
 * @returns Object containing verification results
 */
export const verifyTestAndSubjectFile = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<{ 
  isValid: boolean; 
  test?: any; 
  user?: any; 
  error?: string;
}> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isValid: false, error: "User not authenticated" };
    }
    
    // Verify test exists and get subject ID
    const { data: test } = await supabase
      .from('tests')
      .select('user_id, subject_id')
      .eq('id', testId)
      .single();
      
    if (!test) {
      return { isValid: false, error: "Test not found" };
    }
    
    // Verify test ownership
    if (test.user_id !== user.id) {
      return { isValid: false, error: "You don't have permission to modify this test" };
    }
    
    // Verify subject ID matches
    if (test.subject_id !== subjectFile.subject_id) {
      return { isValid: false, error: "The selected file belongs to a different subject" };
    }
    
    // Verify required files exist
    if (!subjectFile.question_paper_url) {
      return { isValid: false, error: "Question paper URL is missing" };
    }
    
    if (!subjectFile.answer_key_url) {
      return { isValid: false, error: "Answer key URL is missing - this is now required" };
    }
    
    return { isValid: true, test, user };
  } catch (error) {
    console.error("Error verifying test and subject file:", error);
    return { isValid: false, error: "Verification error: " + (error instanceof Error ? error.message : "Unknown error") };
  }
};

/**
 * Verifies that source files exist and are complete
 * 
 * @param subjectFile The subject file to verify
 * @returns Object indicating verification success
 */
export const verifySourceFiles = async (
  subjectFile: SubjectFile
): Promise<{ 
  success: boolean; 
  error?: string;
}> => {
  try {
    // Verify question paper URL exists
    if (!subjectFile.question_paper_url) {
      return { success: false, error: "Question paper URL is missing" };
    }
    
    // Verify answer key URL exists
    if (!subjectFile.answer_key_url) {
      return { success: false, error: "Answer key URL is missing" };
    }
    
    // Check if the URLs are accessible
    // We could add more validation here if needed
    
    return { success: true };
  } catch (error) {
    console.error("Error verifying source files:", error);
    return { 
      success: false, 
      error: "Error verifying source files: " + (error instanceof Error ? error.message : "Unknown error") 
    };
  }
};
