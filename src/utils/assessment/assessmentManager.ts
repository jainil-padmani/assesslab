
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

interface AssessmentOptions {
  shuffle_answers: boolean;
  time_limit_enabled: boolean;
  time_limit_minutes: number | null;
  allow_multiple_attempts: boolean;
  show_quiz_responses: boolean;
  show_once_after_attempt: boolean;
  show_correct_answers: boolean;
  show_correct_answers_at: string | null;
  hide_correct_answers_at: string | null;
  show_one_question_at_time: boolean;
}

interface AssessmentRestrictions {
  require_access_code: boolean;
  access_code: string | null;
  filter_ip: boolean;
  filter_ip_address: string | null;
}

interface AssessmentDetails {
  title: string;
  instructions?: string | null;
  options: AssessmentOptions;
  restrictions: AssessmentRestrictions;
  assign_to?: string[] | null;
  due_date?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  subject_id: string;
  created_by: string;
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
 * Fetch all subjects
 */
export const fetchSubjects = async () => {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, subject_code');
    
  if (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
  
  return data || [];
};

/**
 * Fetch assessments for a subject
 */
export const fetchSubjectAssessments = async (subjectId: string) => {
  try {
    const { data, error } = await supabase
      .from('assessments_master')
      .select('*')
      .eq('subject_id', subjectId);
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching assessments for subject:', error);
    toast.error('Failed to load assessments');
    throw error;
  }
};

/**
 * Fetch assessment details
 */
export const fetchAssessmentDetails = async (assessmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('assessments_master')
      .select('*')
      .eq('id', assessmentId)
      .single();
      
    if (error) {
      console.error('Error fetching assessment details:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Assessment not found');
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching assessment details:', error);
    throw error;
  }
};

/**
 * Fetch assessment questions
 */
export const fetchAssessmentQuestions = async (assessmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true });
      
    if (error) {
      console.error('Error fetching assessment questions:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching assessment questions:', error);
    throw error;
  }
};

/**
 * Create a new assessment
 */
export const createAssessment = async (assessmentDetails: AssessmentDetails, questions: any[]) => {
  try {
    console.log('Creating assessment with details:', assessmentDetails);
    
    // Insert the assessment master record
    const { data: assessmentData, error: assessmentError } = await supabase
      .from('assessments_master')
      .insert({
        title: assessmentDetails.title,
        instructions: assessmentDetails.instructions,
        options: assessmentDetails.options,
        restrictions: assessmentDetails.restrictions,
        assign_to: assessmentDetails.assign_to,
        due_date: assessmentDetails.due_date,
        available_from: assessmentDetails.available_from,
        available_until: assessmentDetails.available_until,
        subject_id: assessmentDetails.subject_id,
        created_by: assessmentDetails.created_by,
        status: 'published',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (assessmentError) {
      console.error('Error creating assessment:', assessmentError);
      throw assessmentError;
    }
    
    if (!assessmentData) {
      throw new Error('Failed to create assessment');
    }
    
    const assessmentId = assessmentData.id;
    console.log('Created assessment with ID:', assessmentId);
    
    // Insert questions for the assessment
    if (questions.length > 0) {
      const questionsWithAssessmentId = questions.map((question, index) => ({
        assessment_id: assessmentId,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options,
        correct_answer: question.correct_answer,
        points: question.points || 1,
        question_order: index + 1
      }));
      
      const { error: questionsError } = await supabase
        .from('assessment_questions')
        .insert(questionsWithAssessmentId);
        
      if (questionsError) {
        console.error('Error adding questions to assessment:', questionsError);
        // We won't throw here to avoid failing the entire operation
        toast.error('Assessment created but some questions could not be added');
      }
    }
    
    toast.success('Assessment created successfully');
    return assessmentId;
  } catch (error: any) {
    console.error('Error in createAssessment:', error);
    toast.error(`Error creating assessment: ${error.message || 'Unknown error'}`);
    throw error;
  }
};

/**
 * Update an existing assessment
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
 * Generate a unique code for assessment access
 */
export const generateAccessCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Submit a student's assessment answers
 */
export const submitAssessmentAnswers = async (
  assessmentId: string,
  studentId: string,
  answers: any[],
  timeSpent: number
) => {
  try {
    // First, check if the student has already submitted this assessment
    const { data: existingSubmission, error: checkError } = await supabase
      .from('student_assessment_attempts')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('student_id', studentId)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking submission:', checkError);
      throw checkError;
    }
    
    // If student has already submitted, create a new attempt
    let attemptNumber = 1;
    if (existingSubmission) {
      // Get the highest attempt number
      const { data: attemptData, error: attemptError } = await supabase
        .from('student_assessment_attempts')
        .select('attempt_number')
        .eq('assessment_id', assessmentId)
        .eq('student_id', studentId)
        .order('attempt_number', { ascending: false })
        .limit(1);
        
      if (attemptError) {
        console.error('Error getting attempt number:', attemptError);
        throw attemptError;
      }
      
      if (attemptData && attemptData.length > 0) {
        attemptNumber = (attemptData[0].attempt_number || 0) + 1;
      }
    }
    
    // Calculate scores
    let totalScore = 0;
    let totalPossibleScore = 0;
    
    // Get the questions with correct answers
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('id, correct_answer, points')
      .eq('assessment_id', assessmentId);
      
    if (questionsError) {
      console.error('Error fetching questions for scoring:', questionsError);
      throw questionsError;
    }
    
    // Calculate score based on correct answers
    if (questions) {
      const questionMap = new Map(questions.map(q => [q.id, q]));
      
      answers.forEach(answer => {
        const question = questionMap.get(answer.question_id);
        if (question) {
          totalPossibleScore += question.points;
          
          // For MCQ, check exact match
          if (String(answer.answer).toLowerCase() === String(question.correct_answer).toLowerCase()) {
            totalScore += question.points;
          }
          // For other types, we'll need more sophisticated checking or manual grading
        }
      });
    }
    
    // Save the submission
    const { data: submission, error: submissionError } = await supabase
      .from('student_assessment_attempts')
      .insert({
        assessment_id: assessmentId,
        student_id: studentId,
        answers: answers,
        score: totalScore,
        possible_score: totalPossibleScore,
        time_spent: timeSpent,
        status: 'completed',
        attempt_number: attemptNumber,
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (submissionError) {
      console.error('Error submitting assessment:', submissionError);
      throw submissionError;
    }
    
    toast.success('Assessment submitted successfully');
    return {
      submissionId: submission.id,
      score: totalScore,
      possibleScore: totalPossibleScore
    };
  } catch (error: any) {
    console.error('Error in submitAssessmentAnswers:', error);
    toast.error(`Error submitting assessment: ${error.message || 'Unknown error'}`);
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
