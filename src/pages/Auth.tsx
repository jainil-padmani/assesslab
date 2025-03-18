
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, GraduationCap, BookOpen } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard");
      }
    };
    
    checkUser();
    
    // Check if teacher mode is requested via URL parameter
    const mode = searchParams.get("mode");
    if (mode === "teacher") {
      setIsTeacherMode(true);
    }
  }, [navigate, searchParams]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;
      toast.success("Password reset instructions sent to your email!");
      setIsForgotPassword(false);
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        console.log("Starting signup process with name:", name);
        
        // Include name in user_metadata during signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name, // This matches the name field in our profiles table trigger
              role: isTeacherMode ? "teacher" : "student"
            }
          }
        });
        
        if (error) {
          console.error("Sign up error:", error);
          throw error;
        }
        
        console.log("Sign up response:", data);
        
        if (data.user) {
          toast.success("Account created successfully! Please check your email for verification.");
          
          // Check if email confirmation is required
          if (!data.user.email_confirmed_at) {
            toast.info("Please check your email to confirm your account before signing in.");
          } else {
            // If email confirmation is not required or already confirmed
            navigate("/dashboard");
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Successfully signed in!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-bold">
              Reset Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Instructions"
                )}
              </Button>
              <Button
                variant="link"
                onClick={() => setIsForgotPassword(false)}
                className="w-full"
              >
                Back to Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            {isTeacherMode ? (
              <BookOpen className="h-10 w-10 text-primary" />
            ) : (
              <GraduationCap className="h-10 w-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl text-center font-bold">
            {isSignUp 
              ? `Create a${isTeacherMode ? " Teacher" : " Student"} Account` 
              : `Sign in to Testara${isTeacherMode ? " (Teacher)" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>
            <div className="flex flex-col space-y-2 text-center">
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-gray-600 hover:text-accent"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Need an account? Sign up"}
              </Button>
              
              {!isTeacherMode && !isSignUp && (
                <Button
                  variant="link"
                  onClick={() => navigate('/auth?mode=teacher')}
                  className="text-sm text-gray-600 hover:text-accent"
                >
                  Teacher Login
                </Button>
              )}
              
              {isTeacherMode && !isSignUp && (
                <Button
                  variant="link"
                  onClick={() => navigate('/auth')}
                  className="text-sm text-gray-600 hover:text-accent"
                >
                  Student Login
                </Button>
              )}
              
              {!isSignUp && isTeacherMode && (
                <Button
                  variant="link"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-gray-600 hover:text-accent"
                >
                  Forgot your password?
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
