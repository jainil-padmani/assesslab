
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  name: string | null;
};

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

export function useUserProfile() {
  return useQuery<Profile | null>({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    }
  });
}
