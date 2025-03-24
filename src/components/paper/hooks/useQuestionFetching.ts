
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Question } from '@/types/papers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseQuestionFetchingProps {
  subjectId?: string;
}

interface QuestionFilters {
  questionType?: string;
  difficultyLevel?: string;
  bloomsLevel?: string;
  marks?: number;
  courseOutcome?: string;
  searchTerm?: string;
}

export function useQuestionFetching({ subjectId }: UseQuestionFetchingProps) {
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [isFiltering, setIsFiltering] = useState(false);

  const {
    data: questions,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['questions', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];

      try {
        const { data, error } = await supabase
          .from('generated_questions')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the questions arrays into a single array with metadata
        const flattenedQuestions: Question[] = [];
        
        data.forEach(item => {
          if (item.questions && Array.isArray(item.questions)) {
            item.questions.forEach((q: Question) => {
              flattenedQuestions.push({
                ...q,
                source_id: item.id,
                topic: item.topic,
                created_at: item.created_at
              });
            });
          }
        });

        return flattenedQuestions;
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast.error('Failed to load questions');
        return [];
      }
    },
    enabled: !!subjectId
  });

  const applyFilters = (newFilters: QuestionFilters) => {
    setFilters(newFilters);
    setIsFiltering(true);
  };

  const filteredQuestions = (questions || []).filter(question => {
    if (!isFiltering) return true;

    // Apply type filter
    if (filters.questionType && question.type !== filters.questionType) {
      return false;
    }

    // Apply difficulty filter
    if (filters.difficultyLevel) {
      const difficulty = question.difficulty?.toLowerCase();
      if (!difficulty || !difficulty.includes(filters.difficultyLevel.toLowerCase())) {
        return false;
      }
    }

    // Apply Bloom's taxonomy filter
    if (filters.bloomsLevel && question.level !== filters.bloomsLevel) {
      return false;
    }

    // Apply marks filter
    if (filters.marks && question.marks !== filters.marks) {
      return false;
    }

    // Apply course outcome filter
    if (filters.courseOutcome && question.courseOutcome !== filters.courseOutcome) {
      return false;
    }

    // Apply search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const textMatches = question.text?.toLowerCase().includes(searchLower);
      const answerMatches = question.answer?.toLowerCase().includes(searchLower);
      
      // Fix: Added colon after if statement
      if (!textMatches && !answerMatches) {
        return false;
      }
    }

    return true;
  });

  const clearFilters = () => {
    setFilters({});
    setIsFiltering(false);
  };

  return {
    questions: filteredQuestions,
    originalQuestions: questions || [],
    isLoading,
    isError,
    error,
    refetch,
    applyFilters,
    clearFilters,
    filters,
    isFiltering
  };
}
