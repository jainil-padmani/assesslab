
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Class } from '@/hooks/useClassData';

export function useClasses() {
  const { 
    data: classes = [], 
    isLoading, 
    isError,
    error,
    refetch 
  } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .order('name');
        
        if (error) throw error;
        return data as Class[];
      } catch (error: any) {
        console.error('Error fetching classes:', error);
        toast.error(`Failed to load classes: ${error.message}`);
        return [];
      }
    }
  });

  return {
    classes,
    isLoading,
    isError,
    error,
    refetch
  };
}
