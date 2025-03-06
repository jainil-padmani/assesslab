
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
}

export function useClassData(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ["classes", teamId],
    queryFn: async (): Promise<Class[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      let query = supabase.from("classes").select('id, name, department, year');
      
      // Apply team_id filter if available
      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        // If no team_id, filter by user_id
        query = query.eq('user_id', user.id);
      }
      
      // Execute the query with explicit error handling
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching classes:", error);
        return [];
      }
      
      return (data || []) as Class[];
    },
    enabled: true
  });
}
