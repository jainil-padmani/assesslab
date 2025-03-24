
import { supabase } from "@/integrations/supabase/client";

/**
 * Saves or updates an answer sheet record using the test_answers table
 */
export const saveTestAnswer = async (
  studentId: string,
  subjectId: string,
  testId: string,
  answerSheetUrl: string,
  textContent?: string,
  zipUrl?: string
): Promise<string> => {
  try {
    // Check for existing test answer
    const { data: existingData, error: checkError } = await supabase
      .from('test_answers')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('test_id', testId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    // Prepare the data
    const answerData = {
      student_id: studentId,
      subject_id: subjectId,
      test_id: testId,
      answer_sheet_url: answerSheetUrl,
      text_content: textContent || null,
      zip_url: zipUrl || null
    };
    
    if (existingData?.id) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('test_answers')
        .update(answerData)
        .eq('id', existingData.id);
      
      if (updateError) throw updateError;
      return existingData.id;
    } else {
      // Insert new record
      const { data: newData, error: insertError } = await supabase
        .from('test_answers')
        .insert(answerData)
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      if (!newData) throw new Error("Failed to create test answer");
      
      return newData.id;
    }
  } catch (error: any) {
    console.error("Error saving test answer:", error);
    throw new Error(error.message || "Failed to save test answer");
  }
};

/**
 * Retrieves an answer sheet URL for a specific student, subject, and test
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
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching answer sheet URL:', error);
      return null;
    }
    
    // Return null if data doesn't exist
    if (!data) {
      return null;
    }
    
    // Use type assertion to ensure TypeScript knows 'data' exists
    const typedData = data as { answer_sheet_url?: string | null };
    
    // Now check if the property exists
    if ('answer_sheet_url' in typedData && typedData.answer_sheet_url) {
      return typedData.answer_sheet_url;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getAnswerSheetUrl:', error);
    return null;
  }
};

/**
 * Retrieves the ZIP URL containing PNG images of the student's answer sheet
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
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching answer sheet ZIP URL:', error);
      return null;
    }
    
    // Return null if data doesn't exist
    if (!data) {
      return null;
    }
    
    // Use type assertion to ensure TypeScript knows 'data' exists
    const typedData = data as { zip_url?: string | null };
    
    // Now check if the property exists
    if ('zip_url' in typedData && typedData.zip_url) {
      return typedData.zip_url;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getAnswerSheetZipUrl:', error);
    return null;
  }
};
