
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTeamData } from "@/hooks/useTeamData";
import { AlertCircle, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TeamManagement = () => {
  const { userProfile, session, joinTeam, createTeam, leaveTeam, isLoading } = useTeamData();
  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [memberCode, setMemberCode] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
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
        
      if (error) {
        console.error("Error fetching team details:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!userProfile?.team_id
  });

  // Get team members
  const { data: teamMembers, refetch: refetchTeamMembers } = useQuery({
    queryKey: ["team-members", userProfile?.team_id],
    queryFn: async () => {
      if (!userProfile?.team_id) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, post, team_code")
        .eq("team_id", userProfile.team_id);
        
      if (error) {
        console.error("Error fetching team members:", error);
        return [];
      }
      
      return data;
    },
    enabled: !!userProfile?.team_id
  });

  const handleJoinTeam = async () => {
    if (!teamCode.trim()) {
      toast.error("Please enter a team code");
      return;
    }

    try {
      await joinTeam(teamCode);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Successfully joined the team!");
      setTeamCode("");
    } catch (error: any) {
      toast.error(error.message || "Failed to join team");
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    try {
      const result = await createTeam(teamName);
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Team created successfully!");
      setTeamName("");
      
      // Invalidate the team details query to fetch the new team data
      queryClient.invalidateQueries({ queryKey: ["team-details"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create team");
    }
  };

  const handleLeaveTeam = async () => {
    try {
      await leaveTeam();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("You have left the team");
    } catch (error: any) {
      toast.error(error.message || "Failed to leave team");
    }
  };

  const handleAddMember = async () => {
    if (!memberCode.trim() || memberCode.length !== 6) {
      toast.error("Please enter a valid 6-digit user code");
      return;
    }

    setIsAddingMember(true);
    try {
      // Find the user with this code
      const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("id, team_id")
        .eq("team_code", memberCode);

      if (userError || !users || users.length === 0) {
        throw new Error("Invalid user code");
      }

      const userToAdd = users[0];
      
      if (userToAdd.team_id) {
        throw new Error("User is already in a team");
      }

      // Update the user's profile with the team ID
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ team_id: userProfile?.team_id })
        .eq("id", userToAdd.id);

      if (updateError) {
        throw updateError;
      }

      toast.success("Team member added successfully!");
      setMemberCode("");
      refetchTeamMembers();
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast.error(error.message || "Failed to add team member");
    } finally {
      setIsAddingMember(false);
    }
  };

  // Show different content based on whether user is in a team
  if (userProfile?.team_id) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Manage your team settings and members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Team Name</Label>
            <div className="text-lg font-medium">{teamDetails?.name}</div>
          </div>
          <div>
            <Label>Team Code</Label>
            <div className="text-lg font-medium border p-2 rounded bg-muted mt-1 font-mono">
              {teamDetails?.team_code || "Loading..."}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Share this code with others to let them join your team
            </p>
          </div>

          {session?.user && (
            <div>
              <Label>Your User Code</Label>
              <div className="text-lg font-medium border p-2 rounded bg-muted mt-1 font-mono">
                {userProfile?.team_code || "Loading..."}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your personal 6-digit code that identifies you in the system
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-lg">Team Members</Label>
                <p className="text-sm text-muted-foreground">
                  {teamMembers?.length || 0} members in your team
                </p>
              </div>
              
              <div className="flex gap-2 items-center">
                <Input
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  placeholder="Enter 6-digit user code"
                  className="w-48"
                  maxLength={6}
                />
                <Button 
                  onClick={handleAddMember} 
                  disabled={isAddingMember || !memberCode || memberCode.length !== 6}
                  size="sm"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {teamMembers?.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No team members</AlertTitle>
                  <AlertDescription>
                    Add team members using their 6-digit user code
                  </AlertDescription>
                </Alert>
              ) : (
                teamMembers?.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.post || "No role specified"}</div>
                    </div>
                    <div className="text-sm bg-muted px-2 py-1 rounded font-mono">
                      {member.team_code}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button onClick={handleLeaveTeam} variant="destructive" className="mt-4">
            Leave Team
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Join a Team</CardTitle>
        <CardDescription>
          Enter a team code to join an existing team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="team-code">Team Code</Label>
          <div className="flex mt-1">
            <Input
              id="team-code"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              placeholder="Enter team code"
              className="mr-2"
            />
            <Button onClick={handleJoinTeam} disabled={isLoading}>
              Join
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <CardTitle className="mb-2">Create a New Team</CardTitle>
          <CardDescription className="mb-4">
            Create your own team and invite others to join.
          </CardDescription>
          <div>
            <Label htmlFor="team-name">Team Name</Label>
            <div className="flex mt-1">
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                className="mr-2"
              />
              <Button onClick={handleCreateTeam} disabled={isLoading}>
                Create
              </Button>
            </div>
          </div>
        </div>

        {session?.user && (
          <div className="pt-4 border-t">
            <Label>Your User Code</Label>
            <div className="text-lg font-medium border p-2 rounded bg-muted mt-1 font-mono">
              {userProfile?.team_code || "Loading..."}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your personal 6-digit code that identifies you in the system
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
