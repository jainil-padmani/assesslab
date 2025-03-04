
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTeamData } from "@/hooks/useTeamData";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TeamSettings() {
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  
  const { userProfile, session, joinTeam, createTeam, leaveTeam, isLoading } = useTeamData();
  const queryClient = useQueryClient();

  // Get user profile data
  const { data: profileData } = useQuery({
    queryKey: ["user-profile-details"],
    queryFn: async () => {
      if (!session?.user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching profile details:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!session,
    onSuccess: (data) => {
      if (data) {
        setName(data.name || "");
        setBio(data.bio || "");
        setCountry(data.nationality || "");
      }
    }
  });

  // Fetch team details if user is in a team
  const { data: teamDetails } = useQuery({
    queryKey: ["team-details", userProfile?.team_id],
    queryFn: async () => {
      if (!userProfile?.team_id) return null;
      
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", userProfile.team_id)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching team details:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!userProfile?.team_id,
  });

  // Fetch team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", userProfile?.team_id],
    queryFn: async () => {
      if (!userProfile?.team_id) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("team_id", userProfile.team_id);
        
      if (error) {
        console.error("Error fetching team members:", error);
        return [];
      }
      
      return data || [];
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          bio,
          nationality: country
        })
        .eq("id", session.user.id);
        
      if (error) throw error;
      
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["user-profile-details"] });
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(`Failed to update password: ${error.message}`);
    }
  };

  if (!session) {
    return (
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>Team Settings</CardTitle>
          <CardDescription>You need to be logged in to manage teams</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={session.user.email || ""}
                readOnly
                disabled
                placeholder="Your email"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USA">United States</SelectItem>
                  <SelectItem value="UK">United Kingdom</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="India">India</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" className="w-full">Update Profile</Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>Password Settings</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>
            
            <Button type="submit" className="w-full">Update Password</Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Settings */}
      {userProfile?.team_id ? (
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle>Your Team</CardTitle>
            <CardDescription>
              You are currently part of a team. Share your team code with colleagues to let them join.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Team Name</Label>
              <div className="text-lg font-medium border p-2 rounded mt-1">{teamDetails?.name || "Loading..."}</div>
            </div>
            <div>
              <Label>Team Code</Label>
              <div className="text-lg font-medium border p-2 rounded bg-muted mt-1 font-mono">{userProfile?.team_code || teamDetails?.team_code || "Loading..."}</div>
            </div>
            <div>
              <Label>Team Members ({teamMembers?.length || 0})</Label>
              <ul className="mt-2 space-y-1 border rounded p-2">
                {teamMembers?.map((member) => (
                  <li key={member.id} className="text-sm p-1 border-b last:border-0">
                    {member.name || "Unnamed user"}
                    {member.id === session?.user?.id && " (You)"}
                    {member.id === teamDetails?.admin_id && " (Admin)"}
                  </li>
                ))}
                {teamMembers?.length === 0 && (
                  <li className="text-sm text-muted-foreground p-1">No members found</li>
                )}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={handleLeaveTeam} disabled={isLoading}>
              Leave Team
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <Card className="border border-border shadow-sm">
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
                    className="border border-input"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full">Create Team</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
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
                    className="border border-input"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full">Join Team</Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
