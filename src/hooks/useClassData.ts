
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
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      // Determine filter based on team membership
      const filterColumn = teamId ? 'team_id' : 'user_id';
      const filterValue = teamId || user.id;
      
      // Execute the query with explicit error handling
      const { data, error } = await supabase
        .from("classes")
        .select('id, name, department, year')
        .eq(filterColumn, filterValue)
        .order('name');
      
      if (error) {
        console.error("Error fetching classes:", error);
        return [];
      }
      
      return data as Class[];
    },
  });
}
