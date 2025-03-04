
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTeamData } from "@/hooks/useTeamData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries } from "@/utils/countries";
import { Textarea } from "@/components/ui/textarea";

const TeamSettings = () => {
  const { userProfile, session, joinTeam, createTeam, leaveTeam, isLoading } = useTeamData();
  const [teamCode, setTeamCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const queryClient = useQueryClient();

  // For profile settings
  const [email, setEmail] = useState("");
  const [post, setPost] = useState("");

  // Get user profile data for profile settings
  const { data: profileData } = useQuery({
    queryKey: ["profile-details", session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile details:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!session
  });
  
  // Update state when profileData changes
  useEffect(() => {
    if (profileData) {
      setName(profileData.name || "");
      setCountry(profileData.nationality || "");
      setPost(profileData.post || "");
      setEmail(session?.user?.email || "");
    }
  }, [profileData, session]);

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
  const { data: teamMembers } = useQuery({
    queryKey: ["team-members", userProfile?.team_id],
    queryFn: async () => {
      if (!userProfile?.team_id) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, post")
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

  const updateProfile = async () => {
    if (!session?.user) return;
    
    setIsUpdatingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          nationality: country,
          post,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.user.id);
        
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["profile-details"] });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const updatePassword = async () => {
    toast.info("Password update functionality will be implemented in a future update");
  };

  // Show different content based on whether user is in a team
  const renderTeamContent = () => {
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
                {userProfile?.team_code || teamDetails?.team_code || "Loading..."}
              </div>
            </div>
            <div>
              <Label>Team Members ({teamMembers?.length || 0})</Label>
              <div className="mt-2 space-y-2">
                {teamMembers?.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">{member.post || "No role specified"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleLeaveTeam} variant="destructive">
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={email} 
              disabled 
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Your name"
            />
          </div>
          <div>
            <Label htmlFor="post">Position/Role</Label>
            <Input 
              id="post" 
              value={post} 
              onChange={(e) => setPost(e.target.value)} 
              placeholder="Your position or role"
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="country" className="w-full">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={updateProfile} 
            disabled={isUpdatingProfile}
            className="mt-2"
          >
            {isUpdatingProfile ? "Updating..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={updatePassword}>
            Change Password
          </Button>
        </CardContent>
      </Card>

      {renderTeamContent()}
    </div>
  );
};

export default TeamSettings;
