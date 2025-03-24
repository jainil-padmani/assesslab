
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssessmentData {
  student_id: string;
  subject_id: string;
  answer_sheet_url: string;
  status: string;
  updated_at: string;
  test_id?: string;
  text_content?: string | null;
  zip_url?: string | null;
}

/**
 * Check for existing test answers for a student in a subject/test
 */
export const fetchExistingAssessments = async (
  studentId: string,
  subjectId: string,
  testId?: string
) => {
  try {
    let query = supabase
      .from('test_answers')
      .select('id, answer_sheet_url, text_content');
    
    query = query.eq('student_id', studentId).eq('subject_id', subjectId);
    
    if (testId) {
      query = query.eq('test_id', testId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking existing test answers:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchExistingAssessments:', error);
    return [];
  }
};

/**
 * Updates an existing test answer with new data
 */
export const updateAssessment = async (
  answerId: string,
  assessmentData: Partial<AssessmentData>
) => {
  try {
    const { error } = await supabase
      .from('test_answers')
      .update({
        answer_sheet_url: assessmentData.answer_sheet_url,
        text_content: assessmentData.text_content
      })
      .eq('id', answerId);
      
    if (error) throw error;
    
    toast.success('Answer sheet updated successfully');
  } catch (error) {
    console.error('Error in updateAssessment:', error);
    throw error;
  }
};

/**
 * Creates a new test answer
 */
export const createAssessment = async (assessmentData: {
  student_id: string;
  subject_id: string;
  test_id?: string;
  answer_sheet_url?: string;
  text_content?: string | null;
}) => {
  try {
    const { error } = await supabase
      .from('test_answers')
      .insert({
        student_id: assessmentData.student_id,
        subject_id: assessmentData.subject_id,
        test_id: assessmentData.test_id,
        answer_sheet_url: assessmentData.answer_sheet_url,
        text_content: assessmentData.text_content
      });

    if (error) throw error;
    toast.success('Answer sheet uploaded successfully');
  } catch (error) {
    console.error('Error in createAssessment:', error);
    throw error;
  }
};

/**
 * Removes duplicate test answers, keeping only the primary one
 */
export const removeDuplicateAssessments = async (
  primaryId: string,
  duplicateIds: string[]
) => {
  if (duplicateIds.length === 0) return;
  
  try {
    const { error } = await supabase
      .from('test_answers')
      .delete()
      .in('id', duplicateIds);
      
    if (error) {
      console.error('Error removing duplicate test answers:', error);
    } else {
      console.log(`Removed ${duplicateIds.length} duplicate test answer(s)`);
    }
  } catch (error) {
    console.error('Error in removeDuplicateAssessments:', error);
  }
};
