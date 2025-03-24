
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Subject } from "@/types/dashboard";

export function useSubjects(classId: string) {
  const { data: subjects, isLoading, error, refetch } = useQuery({
    queryKey: ['subjects', classId],
    queryFn: async (): Promise<Subject[]> => {
      if (!classId) return [];
      
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching subjects:', error);
        toast.error("Failed to load subjects");
        return [];
      }
    },
    enabled: !!classId,
    meta: {
      onError: (err: Error) => {
        toast.error(`Failed to fetch subjects: ${err.message}`);
      }
    }
  });

  return {
    subjects,
    isLoading,
    error,
    refetch
  };
}
