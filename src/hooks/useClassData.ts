
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
}

export function useClassData() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async (): Promise<Class[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      // Simple query filtering by user_id only
      const { data, error } = await supabase
        .from("classes")
        .select('id, name, department, year')
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error fetching classes:", error);
        return [];
      }
      
      return (data || []) as Class[];
    },
    enabled: true
  });
}
