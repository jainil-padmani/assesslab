
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EvaluationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PaperEvaluation {
  id: string;
  test_id: string;
  student_id: string;
  subject_id: string;
  evaluation_data: any;
  status: EvaluationStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for fetching evaluation data for a test
 */
export function useEvaluationData(selectedTest: string) {
  const { 
    data: evaluations = [], 
    refetch: refetchEvaluations,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['evaluations', selectedTest],
    queryFn: async () => {
      if (!selectedTest) return [];
      
      console.log("Fetching evaluations for test:", selectedTest);
      
      const { data, error } = await supabase
        .from('paper_evaluations')
        .select('*')
        .eq('test_id', selectedTest);
      
      if (error) {
        console.error("Error fetching evaluations:", error);
        return [];
      }
      
      console.log(`Found ${data?.length || 0} evaluations for test ${selectedTest}`);
      return data as PaperEvaluation[];
    },
    enabled: !!selectedTest
  });

  return {
    evaluations,
    refetchEvaluations,
    isLoading,
    isError,
    error
  };
}
