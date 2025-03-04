
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  team_id: string | null;
  team_code: string | null;
}

export function useUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // First, check if user has a team_code. If not, generate one
      const { data, error } = await supabase
        .from('profiles')
        .select('team_id, team_code')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }
      
      // If no team_code exists, generate a 6-digit code and update the profile
      if (data && !data.team_code) {
        const userCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ team_code: userCode })
          .eq("id", user.id);
          
        if (updateError) {
          console.error("Error updating user code:", updateError);
        } else {
          // Return updated profile
          return { ...data, team_code: userCode };
        }
      }
      
      return data as UserProfile;
    },
  });
}
