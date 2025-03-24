
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
  zip_url?: string | null; // ZIP URL is now properly typed
}

/**
 * Check for existing assessments for a student in a subject/test
 */
export const fetchExistingAssessments = async (
  studentId: string,
  subjectId: string,
  testId?: string
) => {
  let query = supabase
    .from('assessments')
    .select('id, answer_sheet_url, text_content, zip_url');
  
  query = query.eq('student_id', studentId).eq('subject_id', subjectId);
  
  if (testId) {
    query = query.eq('test_id', testId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error checking existing assessments:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Updates an existing assessment with new data
 */
export const updateAssessment = async (
  assessmentId: string,
  assessmentData: AssessmentData
) => {
  const { error } = await supabase
    .from('assessments')
    .update(assessmentData)
    .eq('id', assessmentId);
    
  if (error) throw error;
  
  toast.success('Answer sheet updated successfully');
};

/**
 * Creates a new assessment
 */
export const createAssessment = async (assessmentData: AssessmentData) => {
  const { error } = await supabase
    .from('assessments')
    .insert({
      ...assessmentData,
      created_at: new Date().toISOString()
    });

  if (error) throw error;
  toast.success('Answer sheet uploaded successfully');
};

/**
 * Removes duplicate assessments, keeping only the primary one
 */
export const removeDuplicateAssessments = async (
  primaryId: string,
  duplicateIds: string[]
) => {
  if (duplicateIds.length === 0) return;
  
  const { error } = await supabase
    .from('assessments')
    .delete()
    .in('id', duplicateIds);
    
  if (error) {
    console.error('Error removing duplicate assessments:', error);
  } else {
    console.log(`Removed ${duplicateIds.length} duplicate assessment(s)`);
  }
};
