
import { supabase } from "@/integrations/supabase/client";

/**
 * Save a test answer to the database
 */
export const saveTestAnswer = async (
  studentId: string,
  subjectId: string,
  testId: string,
  answerSheetUrl: string,
  notes: string = "",
  zipUrl?: string
): Promise<string> => {
  try {
    // Check for existing answer
    const { data: existingAnswers, error: fetchError } = await supabase
      .from('test_answers')
      .select('id, answer_sheet_url')
      .match({ student_id: studentId, subject_id: subjectId, test_id: testId });
      
    if (fetchError) throw fetchError;
    
    if (existingAnswers && existingAnswers.length > 0) {
      // Update existing answer
      const { error: updateError } = await supabase
        .from('test_answers')
        .update({
          answer_sheet_url: answerSheetUrl,
          zip_url: zipUrl
        })
        .eq('id', existingAnswers[0].id);
        
      if (updateError) throw updateError;
      
      return existingAnswers[0].id;
    } else {
      // Insert new answer
      const { data: insertData, error: insertError } = await supabase
        .from('test_answers')
        .insert({
          student_id: studentId,
          subject_id: subjectId,
          test_id: testId,
          answer_sheet_url: answerSheetUrl,
          zip_url: zipUrl
        })
        .select('id');
        
      if (insertError) throw insertError;
      
      return insertData?.[0]?.id;
    }
  } catch (error) {
    console.error("Error saving test answer:", error);
    throw error;
  }
};

/**
 * Get the answer sheet URL for a student's test
 */
export const getAnswerSheetUrl = async (
  studentId: string,
  subjectId: string,
  testId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('test_answers')
      .select('answer_sheet_url')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('test_id', testId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No records found - not an error
        return null;
      }
      throw error;
    }
    
    return data?.answer_sheet_url || null;
  } catch (error) {
    console.error("Error getting answer sheet URL:", error);
    return null;
  }
};

/**
 * Get the ZIP URL (if any) for a student's test answer
 */
export const getAnswerSheetZipUrl = async (
  studentId: string,
  subjectId: string,
  testId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('test_answers')
      .select('zip_url')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('test_id', testId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        // No records found - not an error
        return null;
      }
      throw error;
    }
    
    return data?.zip_url || null;
  } catch (error) {
    console.error("Error getting answer sheet ZIP URL:", error);
    return null;
  }
};
