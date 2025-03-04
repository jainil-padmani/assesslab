
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  team_id: string | null;
};

export type Subject = {
  id: string;
  name: string;
};

export type Class = {
  id: string;
  name: string;
};

export function useTestFormData(profileData: Profile | null | undefined) {
  // Fetch subjects
  const subjectsQuery = useQuery<Subject[]>({
    queryKey: ["subjects", profileData?.team_id],
    queryFn: async () => {
      let query = supabase.from("subjects").select("id, name");
      
      if (profileData?.team_id) {
        query = query.eq("team_id", profileData.team_id);
      }
      
      const { data, error } = await query.order("name");
        
      if (error) {
        console.error("Error fetching subjects:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!profileData,
  });

  // Fetch classes
  const classesQuery = useQuery<Class[]>({
    queryKey: ["classes", profileData?.team_id],
    queryFn: async () => {
      let query = supabase.from("classes").select("id, name");
      
      if (profileData?.team_id) {
        query = query.eq("team_id", profileData.team_id);
      }
      
      const { data, error } = await query.order("name");
        
      if (error) {
        console.error("Error fetching classes:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!profileData,
  });

  return { 
    subjects: subjectsQuery.data || [], 
    classes: classesQuery.data || [] 
  };
}

export function useUserProfile() {
  return useQuery<Profile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data || null;
    }
  });
}
