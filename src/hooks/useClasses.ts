
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Class } from "@/hooks/useClassData";

export function useClasses() {
  const { data: classes, isLoading, error, refetch } = useQuery({
    queryKey: ['classes'],
    queryFn: async (): Promise<Class[]> => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .order('name', { ascending: true });
        
        if (error) {
          throw new Error(error.message);
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching classes:', error);
        toast.error("Failed to load classes");
        return [];
      }
    },
    meta: {
      onError: (err: Error) => {
        toast.error(`Failed to fetch classes: ${err.message}`);
      }
    }
  });

  return {
    classes,
    isLoading,
    error,
    refetch
  };
}
