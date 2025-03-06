
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Subject = {
  id: string;
  name: string;
};

export type Class = {
  id: string;
  name: string;
};

export function useTestFormData() {
  // Fetch subjects
  const subjectsQuery = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async (): Promise<Subject[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");
        
      if (error) {
        console.error("Error fetching subjects:", error);
        throw error;
      }
      
      return data || [];
    }
  });

  // Fetch classes
  const classesQuery = useQuery<Class[]>({
    queryKey: ["classes"],
    queryFn: async (): Promise<Class[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");
        
      if (error) {
        console.error("Error fetching classes:", error);
        throw error;
      }
      
      return data || [];
    }
  });

  return { 
    subjects: subjectsQuery.data || [], 
    classes: classesQuery.data || [] 
  };
}
