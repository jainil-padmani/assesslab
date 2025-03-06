
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// This is a placeholder implementation since team functionality has been removed
// The component is kept to prevent build errors, but functionality is disabled

interface UserProfile {
  id: string;
  name: string | null;
}

export function useTeamData() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Get current user
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  // Get user's profile info
  const { data: userProfile, isLoading: isProfileLoading } = useQuery<UserProfile | null, Error>({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null;
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", session.user.id)
        .maybeSingle();
        
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return null;
      }
      
      return profile;
    },
    enabled: !!session?.user?.id
  });

  // All team functionality is disabled
  const joinTeam = async () => {
    toast.error("Team functionality has been removed from this application");
    return false;
  };

  const createTeam = async () => {
    toast.error("Team functionality has been removed from this application");
    return null;
  };

  const leaveTeam = async () => {
    toast.error("Team functionality has been removed from this application");
    return false;
  };

  return {
    isLoading: isLoading || isProfileLoading,
    userProfile,
    session,
    joinTeam,
    createTeam,
    leaveTeam
  };
}
