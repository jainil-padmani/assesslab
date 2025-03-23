
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
  console.log("Fetching assessments for:", { studentId, subjectId, testId });
  
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
  
  console.log("Found assessments:", data);
  return data || [];
};

/**
 * Updates an existing assessment with new data
 */
export const updateAssessment = async (
  assessmentId: string,
  assessmentData: AssessmentData
) => {
  console.log("Updating assessment:", { assessmentId, assessmentData });
  
  const { error } = await supabase
    .from('assessments')
    .update(assessmentData)
    .eq('id', assessmentId);
    
  if (error) {
    console.error("Error updating assessment:", error);
    throw error;
  }
  
  toast.success('Answer sheet updated successfully');
};

/**
 * Creates a new assessment
 */
export const createAssessment = async (assessmentData: AssessmentData) => {
  console.log("Creating assessment with data:", assessmentData);
  
  const { data, error } = await supabase
    .from('assessments')
    .insert({
      ...assessmentData,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error("Error creating assessment:", error);
    throw error;
  }
  
  console.log("Assessment created:", data);
  toast.success('Answer sheet uploaded successfully');
  
  return data[0];
};

/**
 * Creates a new online assessment with questions
 */
export const createOnlineAssessment = async (data: CreateOnlineAssessmentData) => {
  console.log("Creating online assessment with data:", data);
  const { questions, ...assessmentData } = data;
  
  try {
    // Check if the assessment_questions table exists
    const { error: tableCheckError } = await supabase
      .from("assessment_questions")
      .select("id")
      .limit(1);
      
    if (tableCheckError && tableCheckError.code === "42P01") {
      // Table doesn't exist, log the error
      console.error("assessment_questions table does not exist:", tableCheckError);
      toast.error("Error: Database schema is missing required tables. Please contact support.");
      throw new Error("Database schema is missing required tables");
    }
    
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
    
    console.log("Assessment created successfully:", createdAssessment);
    
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
      
      console.log("Adding questions to assessment:", formattedQuestions);
      
      const { data: questionData, error: questionsError } = await supabase
        .from("assessment_questions")
        .insert(formattedQuestions)
        .select();
        
      if (questionsError) {
        console.error("Questions insert error:", questionsError);
        // Don't throw here since assessment was created successfully
        toast.error(`Warning: Questions could not be added: ${questionsError.message}`);
      } else {
        console.log("Questions added successfully:", questionData);
      }
    }
    
    return createdAssessment;
  } catch (error: any) {
    console.error("Complete error creating assessment:", error);
    toast.error(`Error creating assessment: ${error.message}`);
    throw error;
  }
};

/**
 * Fetch assessment details by ID
 */
export const fetchAssessmentById = async (assessmentId: string) => {
  console.log("Fetching assessment by ID:", assessmentId);
  
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("*, subjects(*)")
      .eq("id", assessmentId)
      .single();
    
    if (error) {
      console.error("Error fetching assessment:", error);
      if (error.code === "PGRST116") {
        toast.error("Assessment not found");
      } else {
        toast.error(`Error fetching assessment: ${error.message}`);
      }
      throw error;
    }
    
    if (!data) {
      console.error("Assessment not found with ID:", assessmentId);
      toast.error("Assessment not found");
      throw new Error("Assessment not found");
    }
    
    console.log("Assessment details:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch assessment:", error);
    throw error;
  }
};

/**
 * Fetch assessment questions
 */
export const fetchAssessmentQuestions = async (assessmentId: string) => {
  console.log("Fetching questions for assessment:", assessmentId);
  
  try {
    // Check if the assessment_questions table exists
    const { error: tableCheckError } = await supabase
      .from("assessment_questions")
      .select("id")
      .limit(1);
      
    if (tableCheckError && tableCheckError.code === "42P01") {
      // Table doesn't exist, log the error
      console.error("assessment_questions table does not exist:", tableCheckError);
      toast.error("Error: Database schema is missing required tables for questions");
      return [];
    }
    
    const { data, error } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("order_number");
    
    if (error) {
      console.error("Error fetching assessment questions:", error);
      toast.error(`Failed to load assessment questions: ${error.message}`);
      throw error;
    }
    
    console.log("Assessment questions:", data);
    return data || [];
  } catch (error) {
    console.error("Error in fetchAssessmentQuestions:", error);
    throw error;
  }
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
