
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Test } from "@/types/tests";

/**
 * Hook for fetching test data
 */
export function useTestData(testId: string | undefined) {
  const { data: test, isLoading: isTestLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      if (!testId) return null;
      
      const { data, error } = await supabase
        .from("tests")
        .select("*, subjects!inner(*)")
        .eq("id", testId)
        .single();
      
      if (error) {
        toast.error("Failed to load test details");
        throw error;
      }
      
      return data as Test & { subjects: { name: string, subject_code: string } };
    },
    enabled: !!testId
  });

  return {
    test,
    isTestLoading
  };
}
