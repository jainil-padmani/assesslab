import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, User, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import countries from "../../utils/countries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Profile, TeamMember } from "@/types/dashboard";

export default function Settings() {
  const [userDetails, setUserDetails] = useState<{
    email: string;
    userId: string;
    name?: string | null;
    mobile?: string | null;
    post?: string | null;
    subject?: string | null;
    nationality?: string | null;
    team_code?: string | null;
    team_id?: string | null;
  }>({
    email: "",
    userId: "",
    name: "",
    mobile: "",
    post: "",
    subject: "",
    nationality: "",
    team_code: "",
    team_id: null,
  });
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [teamCode, setTeamCode] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);
  const [isJoiningTeam, setIsJoiningTeam] = useState(false);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserDetails(prev => ({
          ...prev,
          email: user.email || "",
          userId: user.id,
        }));
        
        // Fetch additional user details from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
          
        if (profile) {
          setUserDetails(prev => ({
            ...prev,
            name: profile.name || "",
            mobile: profile.mobile || "",
            post: profile.post || "",
            subject: profile.subject || "",
            nationality: profile.nationality || "",
            team_code: profile.team_code || "",
            team_id: profile.team_id,
          }));

          // If user has a team_id, fetch team members
          if (profile.team_id) {
            fetchTeamMembers(profile.team_id);

            // Check if user is the team admin
            const { data: teamData, error: teamError } = await supabase
              .from('teams')
              .select('admin_id')
              .eq('id', profile.team_id)
              .single();

            if (teamError) {
              console.error('Error fetching team data:', teamError);
              return;
            }

            if (teamData && teamData.admin_id === user.id) {
              setIsTeamAdmin(true);
            } else {
              setIsTeamAdmin(false);
            }
          }
        } else {
          // Generate a unique team code if the user doesn't have one
          const teamCode = generateTeamCode();
          setUserDetails(prev => ({
            ...prev,
            team_code: teamCode,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('team_id', teamId);
        
      if (error) {
        console.error('Error fetching team members:', error);
        return;
      }
      
      // Handle potential null or undefined data
      if (data) {
        // Ensure the data matches the TeamMember interface
        const validTeamMembers: TeamMember[] = data.map(member => ({
          id: member.id,
          name: member.name,
          email: member.email
        }));
        
        setTeamMembers(validTeamMembers);
      } else {
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setTeamMembers([]);
    }
  };

  const generateTeamCode = () => {
    // Generate a random 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | { name: string; value: string }
  ) => {
    const { name, value } = 'target' in e ? e.target : e;
    setUserDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords don't match!");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      toast.success("Password updated successfully!");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const updateData = {
        id: userDetails.userId,
        name: userDetails.name || null,
        mobile: userDetails.mobile || null,
        post: userDetails.post || null,
        subject: userDetails.subject || null,
        nationality: userDetails.nationality || null,
        team_code: userDetails.team_code || null,
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('profiles')
        .upsert(updateData);

      if (error) throw error;
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!teamCode || teamCode.length !== 6) {
      toast.error("Please enter a valid 6-digit team code");
      return;
    }

    try {
      setIsJoiningTeam(true);
      
      // Find the profile with this team code
      const { data: teamLeaderProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, team_id')
        .eq('team_code', teamCode)
        .single();

      if (findError) {
        toast.error("Invalid team code. Please try again.");
        return;
      }

      let teamId = teamLeaderProfile.team_id;

      // If the team leader doesn't have a team yet, create one
      if (!teamId) {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: `${userDetails.name}'s Team`,
            admin_id: teamLeaderProfile.id
          })
          .select()
          .single();

        if (teamError) {
          toast.error("Error creating team. Please try again.");
          return;
        }

        teamId = newTeam.id;

        // Update the team leader's profile with the team_id
        await supabase
          .from('profiles')
          .update({ team_id: teamId })
          .eq('id', teamLeaderProfile.id);
      }

      // Update current user's profile with the team_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', userDetails.userId);

      if (updateError) {
        toast.error("Error joining team. Please try again.");
        return;
      }

      toast.success("Successfully joined the team!");
      // Refresh user details
      fetchUserDetails();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsJoiningTeam(false);
      setTeamCode("");
    }
  };

  const handleLeaveTeam = async () => {
    try {
      setIsLeavingTeam(true);
      
      if (isTeamAdmin) {
        // If user is team admin, show warning
        if (!window.confirm("As the team admin, leaving the team will remove all members from the team. Are you sure you want to continue?")) {
          setIsLeavingTeam(false);
          return;
        }
        
        if (userDetails.team_id) {
          // If confirmed, remove team_id from all team members' profiles
          await supabase
            .from('profiles')
            .update({ team_id: null })
            .eq('team_id', userDetails.team_id);
            
          // Delete the team
          await supabase
            .from('teams')
            .delete()
            .eq('id', userDetails.team_id);
        }
      } else {
        // Just remove this user from the team
        await supabase
          .from('profiles')
          .update({ team_id: null })
          .eq('id', userDetails.userId);
      }
      
      toast.success("Successfully left the team!");
      // Reset team members list and refresh user details
      setTeamMembers([]);
      setIsTeamAdmin(false);
      fetchUserDetails();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setIsLeavingTeam(false);
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!isTeamAdmin) {
      toast.error("Only team admins can remove members");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', memberId);
        
      if (error) {
        throw error;
      }
      
      toast.success("Team member removed successfully");
      
      // Refresh team members list
      if (userDetails.team_id) {
        fetchTeamMembers(userDetails.team_id);
      }
    } catch (error: any) {
      toast.error("Error removing team member: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-accent" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="userId">User ID</Label>
                <Input id="userId" value={userDetails.userId} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={userDetails.email} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={userDetails.name || ""}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  value={userDetails.mobile || ""}
                  onChange={handleChange}
                  placeholder="Enter your mobile number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="post">Post</Label>
                <Select 
                  value={userDetails.post || ""} 
                  onValueChange={(value) => handleChange({ name: "post", value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your post" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOD">HOD</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={userDetails.subject || ""}
                  onChange={handleChange}
                  placeholder="Enter your subject"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Select 
                  value={userDetails.nationality || ""} 
                  onValueChange={(value) => handleChange({ name: "nationality", value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleSave} 
                className="w-full bg-accent hover:bg-accent/90"
                disabled={loading}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-accent" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="oldPassword">Current Password</Label>
                <Input
                  id="oldPassword"
                  name="oldPassword"
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                onClick={handleUpdatePassword}
                className="w-full bg-accent hover:bg-accent/90"
                disabled={loading}
              >
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Team Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 border rounded-md bg-muted/50">
                  <h3 className="font-medium mb-2">Your Team Code</h3>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={userDetails.team_code || ""}
                      readOnly
                      className="font-mono text-lg"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(userDetails.team_code || "");
                        toast.success("Team code copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Share this code with others to let them join your team. All team members will have access to the same data.
                  </p>
                </div>
                
                {!userDetails.team_id ? (
                  <div className="space-y-2">
                    <h3 className="font-medium">Join a Team</h3>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter 6-digit team code"
                        maxLength={6}
                        value={teamCode}
                        onChange={(e) => setTeamCode(e.target.value)}
                      />
                      <Button 
                        onClick={handleJoinTeam}
                        disabled={isJoiningTeam || !teamCode}
                      >
                        {isJoiningTeam ? "Joining..." : "Join"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Team Members</h3>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleLeaveTeam}
                          disabled={isLeavingTeam}
                        >
                          {isLeavingTeam ? "Leaving..." : "Leave Team"}
                        </Button>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            {isTeamAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamMembers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={isTeamAdmin ? 3 : 2} className="text-center py-4 text-muted-foreground">
                                No team members found
                              </TableCell>
                            </TableRow>
                          ) : (
                            teamMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell>{member.name || "Unnamed user"}</TableCell>
                                <TableCell>{member.email || "No email"}</TableCell>
                                {isTeamAdmin && (
                                  <TableCell>
                                    {member.id !== userDetails.userId && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleRemoveTeamMember(member.id)}
                                      >
                                        Remove
                                      </Button>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
