
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "@/types/dashboard";
import { Shield, ShieldCheck, ShieldX, Copy, Eye, EyeOff } from "lucide-react";

interface LoginCredentialsCardProps {
  student: Student;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  getLoginIdValue: () => string;
  copyToClipboard: (text: string, message: string) => void;
  toggleLoginMutation: any;
  isPasswordDialogOpen: boolean;
  setIsPasswordDialogOpen: (open: boolean) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  handleUpdatePassword: () => void;
  isLoginSettingsDialogOpen: boolean;
  setIsLoginSettingsDialogOpen: (open: boolean) => void;
  loginIdType: "gr_number" | "roll_number" | "email";
  setLoginIdType: (type: "gr_number" | "roll_number" | "email") => void;
  handleUpdateLoginSettings: () => void;
}

export function LoginCredentialsCard({
  student,
  showPassword,
  setShowPassword,
  getLoginIdValue,
  copyToClipboard,
  toggleLoginMutation,
  isPasswordDialogOpen,
  setIsPasswordDialogOpen,
  newPassword,
  setNewPassword,
  handleUpdatePassword,
  isLoginSettingsDialogOpen,
  setIsLoginSettingsDialogOpen,
  loginIdType,
  setLoginIdType,
  handleUpdateLoginSettings
}: LoginCredentialsCardProps) {
  
  const loginStatusBadge = (
    <Badge 
      variant={student.login_enabled ? "secondary" : "outline"}
      className={student.login_enabled ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}
    >
      {student.login_enabled ? "Enabled" : "Disabled"}
    </Badge>
  );

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center">
          Login Credentials
          {student.login_enabled && (
            <Button 
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                const loginId = getLoginIdValue();
                const password = student.password || student.roll_number || '';
                copyToClipboard(
                  `Username: ${loginId}\nPassword: ${password}`,
                  "Login credentials copied to clipboard"
                );
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Credentials
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {student.login_enabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldX className="h-5 w-5 text-gray-400" />
              )}
              <span>Login Status</span>
              {loginStatusBadge}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => toggleLoginMutation.mutate(!student.login_enabled)}
            >
              {student.login_enabled ? "Disable" : "Enable"} Login
            </Button>
          </div>

          {student.login_enabled && (
            <>
              <div className="space-y-4 bg-gray-50 p-4 rounded-md border">
                <h3 className="font-medium text-gray-900">Student Login Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Login ID Type</p>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">
                        {student.login_id_type || "email"}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setLoginIdType(student.login_id_type as "gr_number" | "roll_number" | "email" || 'email');
                          setIsLoginSettingsDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Login Username</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{getLoginIdValue()}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(getLoginIdValue() || '', "Username copied to clipboard")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Password</p>
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {showPassword ? student.password || student.roll_number || "Not set" : "••••••••"}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(student.password || student.roll_number || '', "Password copied to clipboard")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
                <div className="pt-2 text-xs text-muted-foreground border-t">
                  <p>Student Login URL: <span className="font-medium">{window.location.origin}/auth</span></p>
                </div>
              </div>

              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Student Password</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsPasswordDialogOpen(false);
                          setNewPassword("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleUpdatePassword}>Update Password</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isLoginSettingsDialogOpen} onOpenChange={setIsLoginSettingsDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Login ID Type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login_id_type">Login ID Type</Label>
                      <Select
                        value={loginIdType}
                        onValueChange={(value: 'gr_number' | 'roll_number' | 'email') => setLoginIdType(value)}
                      >
                        <SelectTrigger id="login_id_type">
                          <SelectValue placeholder="Select login ID type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="gr_number">GR Number</SelectItem>
                          <SelectItem value="roll_number">Roll Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        This determines what identifier the student will use to log in
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsLoginSettingsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateLoginSettings}>Save Changes</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
