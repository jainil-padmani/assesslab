
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Student } from "@/types/dashboard";

export function useStudents(classId: string) {
  const { data: students, isLoading, error, refetch } = useQuery({
    queryKey: ['students', classId],
    queryFn: async (): Promise<Student[]> => {
      if (!classId) return [];
      
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', classId)
          .order('name', { ascending: true });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error("Failed to load students");
        return [];
      }
    },
    enabled: !!classId,
    meta: {
      onError: (err: Error) => {
        toast.error(`Failed to fetch students: ${err.message}`);
      }
    }
  });

  return {
    students,
    isLoading,
    error,
    refetch
  };
}
