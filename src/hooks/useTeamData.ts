
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserProfile {
  team_id: string | null;
  team_code: string | null;
}

export function useTeamData() {
  const [isLoading, setIsLoading] = useState(false);

  // Get current user
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  // Get user's team info - simplified query to avoid deep type instantiation
  const { data: userProfile, isLoading: isProfileLoading } = useQuery<UserProfile | null>({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("team_id, team_code")
        .eq("id", session.user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!session?.user?.id
  });

  // Join a team
  const joinTeam = async (teamCode: string) => {
    if (!session?.user) {
      throw new Error("You must be logged in to join a team");
    }

    setIsLoading(true);
    try {
      // Find the team with this code
      const { data: teams, error: teamError } = await supabase
        .from("teams")
        .select("id, team_code")
        .eq("team_code", teamCode);

      if (teamError || !teams || teams.length === 0) {
        throw new Error("Invalid team code");
      }

      const team = teams[0];

      // Update the user's profile with the team ID
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ team_id: team.id, team_code: teamCode })
        .eq("id", session.user.id);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error: any) {
      console.error("Error joining team:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Create a team
  const createTeam = async (teamName: string) => {
    if (!session?.user) {
      throw new Error("You must be logged in to create a team");
    }

    setIsLoading(true);
    try {
      // Generate a unique team code
      const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create a new team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert([{ 
          name: teamName, 
          admin_id: session.user.id,
          team_code: teamCode 
        }])
        .select()
        .single();

      if (teamError) {
        throw teamError;
      }

      // Update the user's profile with the team ID
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ team_id: team.id, team_code: teamCode })
        .eq("id", session.user.id);

      if (updateError) {
        throw updateError;
      }

      return team;
    } catch (error: any) {
      console.error("Error creating team:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Leave a team
  const leaveTeam = async () => {
    if (!session?.user) {
      throw new Error("You must be logged in to leave a team");
    }

    setIsLoading(true);
    try {
      // Update the user's profile to remove the team ID
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ team_id: null, team_code: null })
        .eq("id", session.user.id);

      if (updateError) {
        throw updateError;
      }

      return true;
    } catch (error: any) {
      console.error("Error leaving team:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
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
