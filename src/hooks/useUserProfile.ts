
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  name: string | null;
  post: string | null;
  nationality: string | null;
}

export function useUserProfile() {
  return useQuery<UserProfile | null, Error>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, post, nationality')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }
      
      return data as UserProfile;
    },
  });
}
