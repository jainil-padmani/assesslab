
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";

interface StudentWithClass extends Student {
  classes: { name: string } | null;
}

export function useStudentData(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ["students", teamId],
    queryFn: async (): Promise<StudentWithClass[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      // Determine filter based on team membership
      const filterColumn = teamId ? 'team_id' : 'user_id';
      const filterValue = teamId || user.id;
      
      // Execute the query with explicit error handling
      const { data, error } = await supabase
        .from("students")
        .select('*, classes(name)');
      
      if (error) {
        console.error("Error fetching students:", error);
        return [];
      }
      
      return (data || []) as StudentWithClass[];
    },
  });
}
