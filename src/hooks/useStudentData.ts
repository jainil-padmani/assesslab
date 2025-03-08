
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

// Define a specific return type with explicit structure
interface StudentWithClass extends Student {
  classes: { name: string } | null;
}

export function useStudentData() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async (): Promise<StudentWithClass[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        
        // Simple query filtering by user_id only
        const { data, error } = await supabase
          .from("students")
          .select('*, classes(name)')
          .eq('user_id', user.id);
        
        if (error) {
          console.error("Error fetching students:", error);
          toast.error(`Error loading students: ${error.message}`);
          return [];
        }
        
        return (data || []) as StudentWithClass[];
      } catch (error) {
        console.error("Unhandled error in useStudentData:", error);
        toast.error("Failed to load students data");
        return [];
      }
    },
    enabled: true
  });
}
