import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  options: string[];
}

interface PaginatedQuestions {
  data: Question[];
  total: number;
}

interface UseQuestionFetchingProps {
  topicId: string;
  currentPage: number;
  questionsPerPage: number;
}

export function useQuestionFetching({
  topicId,
  currentPage,
  questionsPerPage,
}: UseQuestionFetchingProps) {
  const [totalPages, setTotalPages] = useState<number | string>(1);

  const {
    data: paginatedQuestions,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedQuestions>({
    queryKey: ['questions', topicId, currentPage, questionsPerPage],
    queryFn: async (): Promise<PaginatedQuestions> => {
      try {
        const startIndex = (currentPage - 1) * questionsPerPage;

        let query = supabase
          .from('questions')
          .select('*', { count: 'exact' })
          .eq('topic_id', topicId)
          .range(startIndex, startIndex + questionsPerPage - 1);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(error.message);
        }

        const totalQuestions = count || 0;
        setTotalPages(Math.ceil(totalQuestions / questionsPerPage));

        return {
          data: data as Question[],
          total: totalQuestions,
        };
      } catch (error: any) {
        toast.error(`Failed to load questions: ${error.message}`);
        return { data: [], total: 0 };
      }
    },
    keepPreviousData: true,
  });

  const isLastPage = (currentPage: number, totalPages: number | string) => {
    if (typeof totalPages === 'string') {
      return currentPage === parseInt(totalPages, 10);
    }
    return currentPage === totalPages;
  };

  return {
    questions: paginatedQuestions?.data || [],
    isLoading,
    isError,
    error,
    refetch,
    totalPages,
    isLastPage: isLastPage(currentPage, totalPages),
  };
}
