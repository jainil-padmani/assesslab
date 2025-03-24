
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
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single();
        
        if (error) throw error;
        return data as Assessment;
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
          .eq('assessmentId', assessmentId)
          .order('questionOrder', { ascending: true });
        
        if (error) throw error;
        return data as AssessmentQuestion[];
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
        .from('assessments')
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
        .eq('assessmentId', id);
      
      if (questionsError) throw questionsError;
      
      // Then delete the assessment
      const { error } = await supabase
        .from('assessments')
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
      
      const { data, error } = await supabase
        .from('assessment_questions')
        .insert(questionData)
        .select();
      
      if (error) throw error;
      
      // Refetch questions to update the UI
      refetchQuestions();
      return data[0] as AssessmentQuestion;
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
      
      const { error } = await supabase
        .from('assessment_questions')
        .update(updateData)
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
