
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AssessmentQuestion } from "@/types/assessments";

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

interface CreateOnlineAssessmentData {
  title: string;
  instructions?: string;
  subject_id: string;
  user_id: string;
  shuffle_answers?: boolean;
  time_limit?: number | null;
  allow_multiple_attempts?: boolean;
  show_responses?: boolean;
  show_responses_timing?: string;
  show_correct_answers?: boolean;
  show_correct_answers_at?: string | null;
  hide_correct_answers_at?: string | null;
  one_question_at_time?: boolean;
  access_code?: string | null;
  due_date?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  status: 'draft' | 'published';
  link_code?: string | null;
  questions?: AssessmentQuestion[];
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
 * Creates a new online assessment with questions
 */
export const createOnlineAssessment = async (data: CreateOnlineAssessmentData) => {
  const { questions, ...assessmentData } = data;
  
  // Create assessment
  const { data: createdAssessment, error } = await supabase
    .from("assessments")
    .insert(assessmentData)
    .select()
    .single();
    
  if (error) {
    console.error("Assessment creation error:", error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  // Add questions if any
  if (questions && questions.length > 0 && createdAssessment) {
    const formattedQuestions = questions.map((q, index) => ({
      assessment_id: createdAssessment.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      marks: q.marks,
      order_number: index + 1,
      source_question_id: q.source_question_id
    }));
    
    const { error: questionsError } = await supabase
      .from("assessment_questions")
      .insert(formattedQuestions);
      
    if (questionsError) {
      console.error("Questions insert error:", questionsError);
      // Don't throw here since assessment was created successfully
      toast.error(`Warning: Questions could not be added: ${questionsError.message}`);
    }
  }
  
  return createdAssessment;
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
