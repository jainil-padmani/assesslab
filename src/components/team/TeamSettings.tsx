
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTeamData } from "@/hooks/useTeamData";

export default function TeamSettings() {
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const { userProfile, session, joinTeam, createTeam, leaveTeam, isLoading } = useTeamData();
  const queryClient = useQueryClient();

  // Fetch team details if user is in a team
  const { data: teamDetails } = useQuery({
    queryKey: ["team-details", userProfile?.team_id],
    queryFn: async () => {
      if (!userProfile?.team_id) return null;
      
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", userProfile.team_id)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.team_id,
  });

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", userProfile?.team_id],
    queryFn: async () => {
      if (!userProfile?.team_id) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("team_id", userProfile.team_id);
        
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.team_id,
  });

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;
    
    try {
      await createTeam(teamName);
      toast.success("Team created successfully");
      setTeamName("");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["team-details"] });
    } catch (error: any) {
      toast.error(`Failed to create team: ${error.message}`);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode) return;
    
    try {
      await joinTeam(teamCode);
      toast.success("Joined team successfully");
      setTeamCode("");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["team-details"] });
    } catch (error: any) {
      toast.error(`Failed to join team: ${error.message}`);
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm("Are you sure you want to leave this team? You will lose access to all shared data.")) {
      return;
    }
    
    try {
      await leaveTeam();
      toast.success("Left team successfully");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["team-details"] });
    } catch (error: any) {
      toast.error(`Failed to leave team: ${error.message}`);
    }
  };

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>You need to be logged in to manage teams</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (userProfile?.team_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Team</CardTitle>
          <CardDescription>
            You are currently part of a team. Share your team code with colleagues to let them join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Team Name</Label>
            <div className="text-lg font-medium">{teamDetails?.name || "Loading..."}</div>
          </div>
          <div>
            <Label>Team Code</Label>
            <div className="text-lg font-medium">{userProfile?.team_code || "Loading..."}</div>
          </div>
          <div>
            <Label>Team Members ({teamMembers?.length || 0})</Label>
            <ul className="mt-2 space-y-1">
              {teamMembers?.map((member) => (
                <li key={member.id} className="text-sm">
                  {member.name || "Unnamed user"}
                  {member.id === session?.user?.id && " (You)"}
                  {member.id === teamDetails?.admin_id && " (Admin)"}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={handleLeaveTeam} disabled={isLoading}>
            Leave Team
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a Team</CardTitle>
          <CardDescription>Create a new team to share resources with colleagues</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading}>Create Team</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join Existing Team</CardTitle>
          <CardDescription>Enter a team code to join an existing team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinTeam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamCode">Team Code</Label>
              <Input
                id="teamCode"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                placeholder="Enter team code"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading}>Join Team</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
