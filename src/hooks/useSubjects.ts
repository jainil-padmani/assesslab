
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Subject } from '@/types/dashboard';

export function useSubjects(classId?: string) {
  const { 
    data: subjects = [], 
    isLoading, 
    isError,
    error,
    refetch 
  } = useQuery({
    queryKey: ['subjects', classId],
    queryFn: async () => {
      try {
        let query = supabase.from('subjects').select('*');
        
        // If classId is provided, we will implement class-specific filtering
        // in the future when the subject_enrollments table is set up
        
        const { data, error } = await query.order('name');
        
        if (error) throw error;
        return data as Subject[];
      } catch (error: any) {
        console.error('Error fetching subjects:', error);
        toast.error(`Failed to load subjects: ${error.message}`);
        return [];
      }
    },
    enabled: !classId || classId.length > 0
  });

  return {
    subjects,
    isLoading,
    isError,
    error,
    refetch
  };
}
