
import { supabase } from "@/integrations/supabase/client";
import { Assessment, AssessmentQuestion, StudentAssessmentAttempt } from "@/types/assessments";
import { toast } from "sonner";

export async function fetchAssessmentsBySubject(subjectId: string): Promise<Assessment[]> {
  try {
    const { data, error } = await supabase
      .from('assessments_master')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching assessments:", error);
      throw error;
    }
    
    return data as Assessment[];
  } catch (error) {
    console.error("Failed to fetch assessments:", error);
    throw error;
  }
}

export async function fetchAssessmentById(assessmentId: string): Promise<Assessment | null> {
  try {
    const { data, error } = await supabase
      .from('assessments_master')
      .select('*')
      .eq('id', assessmentId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching assessment:", error);
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    // Fetch questions for this assessment
    const { data: questionsData, error: questionsError } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true });
    
    if (questionsError) {
      console.error("Error fetching assessment questions:", questionsError);
      throw questionsError;
    }
    
    return {
      ...data,
      questions: questionsData || []
    } as Assessment;
  } catch (error) {
    console.error("Failed to fetch assessment details:", error);
    throw error;
  }
}

export async function createAssessment(assessment: Omit<Assessment, 'id' | 'createdAt'>): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('assessments_master')
      .insert({
        title: assessment.title,
        instructions: assessment.instructions,
        options: assessment.options,
        restrictions: assessment.restrictions,
        assign_to: assessment.assignTo,
        due_date: assessment.dueDate,
        available_from: assessment.availableFrom,
        available_until: assessment.availableUntil,
        subject_id: assessment.subjectId,
        created_by: assessment.createdBy,
        status: assessment.status
      })
      .select('id')
      .single();
    
    if (error) {
      console.error("Error creating assessment:", error);
      throw error;
    }
    
    return data.id;
  } catch (error) {
    console.error("Failed to create assessment:", error);
    throw error;
  }
}

export async function addQuestionsToAssessment(
  assessmentId: string, 
  questions: Omit<AssessmentQuestion, 'id' | 'assessmentId' | 'createdAt'>[]
): Promise<void> {
  try {
    if (!questions.length) return;
    
    const insertQuestions = questions.map((q, index) => ({
      assessment_id: assessmentId,
      question_text: q.questionText,
      question_type: q.questionType,
      options: q.options,
      correct_answer: q.correctAnswer,
      points: q.points,
      question_order: index + 1
    }));
    
    const { error } = await supabase
      .from('assessment_questions')
      .insert(insertQuestions);
    
    if (error) {
      console.error("Error adding questions to assessment:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to add questions to assessment:", error);
    throw error;
  }
}

export async function updateAssessmentStatus(assessmentId: string, status: Assessment['status']): Promise<void> {
  try {
    const { error } = await supabase
      .from('assessments_master')
      .update({ status })
      .eq('id', assessmentId);
    
    if (error) {
      console.error("Error updating assessment status:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to update assessment status:", error);
    throw error;
  }
}

export async function submitAssessmentAttempt(
  attempt: Omit<StudentAssessmentAttempt, 'id' | 'submittedAt'>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('student_assessment_attempts')
      .insert({
        assessment_id: attempt.assessmentId,
        student_id: attempt.studentId,
        answers: attempt.answers,
        score: attempt.score,
        possible_score: attempt.possibleScore,
        time_spent: attempt.timeSpent,
        status: attempt.status,
        attempt_number: attempt.attemptNumber
      });
    
    if (error) {
      console.error("Error submitting assessment attempt:", error);
      throw error;
    }
    
    toast.success("Assessment submitted successfully");
  } catch (error) {
    console.error("Failed to submit assessment attempt:", error);
    toast.error("Failed to submit assessment. Please try again.");
    throw error;
  }
}

export async function getStudentAttempts(
  assessmentId: string, 
  studentId: string
): Promise<StudentAssessmentAttempt[]> {
  try {
    const { data, error } = await supabase
      .from('student_assessment_attempts')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: false });
    
    if (error) {
      console.error("Error fetching student attempts:", error);
      throw error;
    }
    
    return data as StudentAssessmentAttempt[];
  } catch (error) {
    console.error("Failed to fetch student attempts:", error);
    throw error;
  }
}
