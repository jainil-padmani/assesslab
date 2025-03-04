
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";

// Define a specific return type with explicit structure
interface StudentWithClass extends Student {
  classes: { name: string } | null;
}

export function useStudentData(teamId: string | null | undefined) {
  return useQuery<StudentWithClass[]>({
    queryKey: ["students", teamId],
    queryFn: async (): Promise<StudentWithClass[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      let query = supabase.from("students").select('*, classes(name)');
      
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
        console.error("Error fetching students:", error);
        return [];
      }
      
      return data as StudentWithClass[];
    },
    enabled: true, // Explicitly enable the query
  });
}
