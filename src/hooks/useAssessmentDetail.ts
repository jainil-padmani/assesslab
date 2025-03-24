
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Assessment, AssessmentQuestion } from "@/types/assessments";

export function useAssessmentDetail(assessmentId?: string) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAssessment = useCallback(async () => {
    if (!assessmentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments_master')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assessmentError) {
        throw new Error(assessmentError.message);
      }
      
      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('question_order', { ascending: true });
      
      if (questionsError) {
        throw new Error(questionsError.message);
      }
      
      // Transform the data to match our types
      const formattedAssessment: Assessment = {
        id: assessmentData.id,
        title: assessmentData.title,
        instructions: assessmentData.instructions,
        options: assessmentData.options,
        restrictions: assessmentData.restrictions,
        assignTo: assessmentData.assign_to,
        dueDate: assessmentData.due_date,
        availableFrom: assessmentData.available_from,
        availableUntil: assessmentData.available_until,
        subjectId: assessmentData.subject_id,
        createdBy: assessmentData.created_by,
        status: assessmentData.status,
        createdAt: assessmentData.created_at,
        questions: questionsData as AssessmentQuestion[]
      };
      
      setAssessment(formattedAssessment);
      setQuestions(questionsData as AssessmentQuestion[]);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch assessment'));
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const updateAssessment = async (id: string, data: Partial<Assessment>) => {
    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('assessments_master')
        .update({
          title: data.title,
          instructions: data.instructions,
          options: data.options,
          restrictions: data.restrictions,
          assign_to: data.assignTo,
          due_date: data.dueDate,
          available_from: data.availableFrom,
          available_until: data.availableUntil,
          status: data.status
        })
        .eq('id', id);
      
      if (updateError) throw new Error(updateError.message);
      
      await fetchAssessment();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update assessment'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAssessment = async (id: string) => {
    setIsLoading(true);
    try {
      // First delete all questions
      const { error: deleteQuestionsError } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('assessment_id', id);
      
      if (deleteQuestionsError) throw new Error(deleteQuestionsError.message);
      
      // Then delete the assessment
      const { error: deleteAssessmentError } = await supabase
        .from('assessments_master')
        .delete()
        .eq('id', id);
      
      if (deleteAssessmentError) throw new Error(deleteAssessmentError.message);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete assessment'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createQuestion = async (questionData: Partial<AssessmentQuestion>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assessment_questions')
        .insert({
          assessment_id: questionData.assessmentId,
          question_text: questionData.questionText,
          question_type: questionData.questionType,
          options: questionData.options,
          correct_answer: questionData.correctAnswer,
          points: questionData.points,
          question_order: questionData.questionOrder
        })
        .select();
      
      if (error) throw new Error(error.message);
      
      await fetchAssessment();
      return data[0];
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create question'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuestion = async (id: string, questionData: Partial<AssessmentQuestion>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('assessment_questions')
        .update({
          question_text: questionData.questionText,
          question_type: questionData.questionType,
          options: questionData.options,
          correct_answer: questionData.correctAnswer,
          points: questionData.points,
          question_order: questionData.questionOrder,
          model_answer: questionData.modelAnswer,
          explanation: questionData.explanation
        })
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      
      await fetchAssessment();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update question'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      
      await fetchAssessment();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete question'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    assessment,
    questions,
    isLoading,
    error,
    fetchAssessment,
    updateAssessment,
    deleteAssessment,
    createQuestion,
    updateQuestion,
    deleteQuestion
  };
}
