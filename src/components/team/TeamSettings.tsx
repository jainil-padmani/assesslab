
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
import countries from "@/utils/countries";

const TeamSettings = () => {
  const { session } = useTeamData();
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
    </div>
  );
};

export default TeamSettings;
