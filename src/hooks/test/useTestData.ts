
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Test } from "@/types/tests";

/**
 * Hook for fetching test data with optimized query patterns
 */
export function useTestData(testId: string | undefined) {
  const { data: test, isLoading: isTestLoading, refetch } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      if (!testId) return null;
      
      // Use an optimized query that utilizes the index on tests.id
      // and uses a more efficient join pattern
      const { data, error } = await supabase
        .from("tests")
        .select(`
          *,
          subjects!inner(name, subject_code)
        `)
        .eq("id", testId)
        .single();
      
      if (error) {
        toast.error("Failed to load test details");
        console.error("Error loading test details:", error);
        throw error;
      }
      
      return data as Test & { subjects: { name: string, subject_code: string } };
    },
    enabled: !!testId,
    staleTime: 5 * 60 * 1000 // Cache valid for 5 minutes
  });

  return {
    test,
    isTestLoading,
    refetchTest: refetch
  };
}
