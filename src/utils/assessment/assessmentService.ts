
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
    
    // Fix the type conversion by mapping the database schema to the expected TypeScript types
    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      instructions: item.instructions,
      options: item.options,
      restrictions: item.restrictions,
      assignTo: item.assign_to,
      dueDate: item.due_date,
      availableFrom: item.available_from,
      availableUntil: item.available_until,
      subjectId: item.subject_id,
      createdBy: item.created_by,
      status: item.status,
      createdAt: item.created_at
    })) as Assessment[];
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
    
    // Map the data to the expected TypeScript types
    return {
      id: data.id,
      title: data.title,
      instructions: data.instructions,
      options: data.options,
      restrictions: data.restrictions,
      assignTo: data.assign_to,
      dueDate: data.due_date,
      availableFrom: data.available_from,
      availableUntil: data.available_until,
      subjectId: data.subject_id,
      createdBy: data.created_by,
      status: data.status,
      createdAt: data.created_at,
      questions: questionsData ? questionsData.map(q => ({
        id: q.id,
        assessmentId: q.assessment_id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: q.options,
        correctAnswer: q.correct_answer,
        points: q.points,
        questionOrder: q.question_order,
        createdAt: q.created_at
      })) : []
    } as Assessment;
  } catch (error) {
    console.error("Failed to fetch assessment details:", error);
    throw error;
  }
}

export async function createAssessment(assessment: Omit<Assessment, 'id' | 'createdAt'>): Promise<string> {
  try {
    // Map the TypeScript types to the database schema
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
    // Convert the TypeScript types to match the database schema
    const { error } = await supabase
      .from('student_assessment_attempts')
      .insert({
        assessment_id: attempt.assessmentId,
        student_id: attempt.studentId,
        answers: attempt.answers as any, // Type casting to handle JSON conversion
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
    
    // Map the database schema to the expected TypeScript types
    return (data || []).map(item => ({
      id: item.id,
      assessmentId: item.assessment_id,
      studentId: item.student_id,
      answers: item.answers,
      score: item.score,
      possibleScore: item.possible_score,
      timeSpent: item.time_spent,
      status: item.status,
      attemptNumber: item.attempt_number,
      submittedAt: item.submitted_at
    })) as StudentAssessmentAttempt[];
  } catch (error) {
    console.error("Failed to fetch student attempts:", error);
    throw error;
  }
}
