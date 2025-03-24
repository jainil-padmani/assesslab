
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
        
        // If classId is provided, filter subjects by class
        if (classId) {
          // Get class-subjects mapping
          const { data: mappings, error: mappingError } = await supabase
            .from('class_subjects')
            .select('subject_id')
            .eq('class_id', classId);
          
          if (mappingError) throw mappingError;
          
          // If there are mappings, filter by them
          if (mappings && mappings.length > 0) {
            const subjectIds = mappings.map(mapping => mapping.subject_id);
            query = query.in('id', subjectIds);
          } else {
            // No subjects for this class
            return [];
          }
        }
        
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
