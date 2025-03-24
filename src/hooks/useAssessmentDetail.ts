
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion } from '@/types/assessments';

export function useAssessmentDetail(assessmentId?: string) {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch assessment details
  const { 
    data: assessment,
    isLoading: assessmentLoading,
    refetch: refetchAssessment
  } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null;
      
      try {
        const { data, error } = await supabase
          .from('assessments_master')
          .select('*')
          .eq('id', assessmentId)
          .single();
        
        if (error) throw error;
        return data as unknown as Assessment;
      } catch (error: any) {
        console.error('Error fetching assessment:', error);
        setError(new Error(`Failed to fetch assessment: ${error.message}`));
        return null;
      }
    },
    enabled: !!assessmentId
  });

  // Fetch assessment questions
  const {
    data: questions,
    isLoading: questionsLoading,
    refetch: refetchQuestions
  } = useQuery({
    queryKey: ['assessment-questions', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      try {
        const { data, error } = await supabase
          .from('assessment_questions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('question_order', { ascending: true });
        
        if (error) throw error;
        
        // Transform data to match AssessmentQuestion type
        return data.map(q => ({
          id: q.id,
          assessmentId: q.assessment_id,
          questionText: q.question_text,
          questionType: q.question_type as 'multiple_choice' | 'short_answer' | 'essay' | 'true_false',
          options: q.options || [],
          correctAnswer: q.correct_answer || '',
          points: q.points,
          questionOrder: q.question_order,
          created_at: q.created_at
        })) as AssessmentQuestion[];
      } catch (error: any) {
        console.error('Error fetching assessment questions:', error);
        setError(new Error(`Failed to fetch assessment questions: ${error.message}`));
        return [];
      }
    },
    enabled: !!assessmentId
  });

  // Update assessment
  const updateAssessment = async (id: string, updateData: Partial<Assessment>) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('assessments_master')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Refetch the assessment to update the UI
      refetchAssessment();
      return true;
    } catch (error: any) {
      console.error('Error updating assessment:', error);
      setError(new Error(`Failed to update assessment: ${error.message}`));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete assessment
  const deleteAssessment = async (id: string) => {
    try {
      setIsLoading(true);
      
      // First delete all questions related to the assessment
      const { error: questionsError } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('assessment_id', id);
      
      if (questionsError) throw questionsError;
      
      // Then delete the assessment
      const { error } = await supabase
        .from('assessments_master')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      setError(new Error(`Failed to delete assessment: ${error.message}`));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a question
  const createQuestion = async (questionData: Partial<AssessmentQuestion>) => {
    try {
      setIsLoading(true);
      
      // Transform to match database schema
      const dbQuestionData = {
        assessment_id: questionData.assessmentId,
        question_text: questionData.questionText,
        question_type: questionData.questionType,
        options: questionData.options,
        correct_answer: questionData.correctAnswer,
        points: questionData.points,
        question_order: questionData.questionOrder || 0
      };
      
      const { data, error } = await supabase
        .from('assessment_questions')
        .insert(dbQuestionData)
        .select();
      
      if (error) throw error;
      
      // Refetch questions to update the UI
      refetchQuestions();
      
      // Transform back to frontend type
      return {
        id: data[0].id,
        assessmentId: data[0].assessment_id,
        questionText: data[0].question_text,
        questionType: data[0].question_type,
        options: data[0].options || [],
        correctAnswer: data[0].correct_answer || '',
        points: data[0].points,
        questionOrder: data[0].question_order,
        created_at: data[0].created_at
      } as AssessmentQuestion;
    } catch (error: any) {
      console.error('Error creating question:', error);
      setError(new Error(`Failed to create question: ${error.message}`));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update a question
  const updateQuestion = async (questionId: string, updateData: Partial<AssessmentQuestion>) => {
    try {
      setIsLoading(true);
      
      // Transform to match database schema
      const dbUpdateData: any = {};
      if (updateData.questionText) dbUpdateData.question_text = updateData.questionText;
      if (updateData.questionType) dbUpdateData.question_type = updateData.questionType;
      if (updateData.options) dbUpdateData.options = updateData.options;
      if (updateData.correctAnswer) dbUpdateData.correct_answer = updateData.correctAnswer;
      if (updateData.points !== undefined) dbUpdateData.points = updateData.points;
      if (updateData.questionOrder !== undefined) dbUpdateData.question_order = updateData.questionOrder;
      
      const { error } = await supabase
        .from('assessment_questions')
        .update(dbUpdateData)
        .eq('id', questionId);
      
      if (error) throw error;
      
      // Refetch questions to update the UI
      refetchQuestions();
      return true;
    } catch (error: any) {
      console.error('Error updating question:', error);
      setError(new Error(`Failed to update question: ${error.message}`));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a question
  const deleteQuestion = async (questionId: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      // Refetch questions to update the UI
      refetchQuestions();
      return true;
    } catch (error: any) {
      console.error('Error deleting question:', error);
      setError(new Error(`Failed to delete question: ${error.message}`));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    assessment,
    questions,
    isLoading: isLoading || assessmentLoading || questionsLoading,
    error,
    fetchAssessment: refetchAssessment,
    updateAssessment,
    deleteAssessment,
    createQuestion,
    updateQuestion,
    deleteQuestion
  };
}
