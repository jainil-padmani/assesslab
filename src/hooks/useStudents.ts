
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Student } from '@/types/dashboard';

export function useStudents(classId?: string) {
  const { 
    data: students = [], 
    isLoading, 
    isError,
    error,
    refetch 
  } = useQuery({
    queryKey: ['students', classId],
    queryFn: async () => {
      try {
        let query = supabase.from('students').select('*');
        
        // If classId is provided, filter students by class
        if (classId) {
          query = query.eq('class_id', classId);
        }
        
        const { data, error } = await query.order('name');
        
        if (error) throw error;
        return data as Student[];
      } catch (error: any) {
        console.error('Error fetching students:', error);
        toast.error(`Failed to load students: ${error.message}`);
        return [];
      }
    },
    enabled: !classId || classId.length > 0
  });

  return {
    students,
    isLoading,
    isError,
    error,
    refetch
  };
}
