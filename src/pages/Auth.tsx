import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "@/integrations/firebase/config";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { toast } from "sonner";
import { 
  Mail, 
  Phone, 
  Github,
  Chrome
} from "lucide-react";

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          // reCAPTCHA solved
        }
      });
    }
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created successfully!");
        navigate("/dashboard");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
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

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        toast.success("Successfully signed in with Google!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast.error(error.message);
    }
  };

  const handlePhoneAuth = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }

    try {
      const formatPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const appVerifier = window.recaptchaVerifier;
      window.confirmationResult = await signInWithPhoneNumber(auth, formatPhone, appVerifier);
      setShowOTPInput(true);
      toast.success("OTP sent successfully!");
    } catch (error: any) {
      console.error("Phone auth error:", error);
      toast.error(error.message);
    }
  };

  const verifyOTP = async () => {
    if (!verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    try {
      const result = await window.confirmationResult.confirm(verificationCode);
      if (result.user) {
        toast.success("Phone number verified successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold">
            {isSignUp ? "Create an account" : "Sign in to TeachLab"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAuthMethod('email')}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAuthMethod('phone')}
              className="w-full"
            >
              <Phone className="mr-2 h-4 w-4" />
              Phone
            </Button>
          </div>

          <div className="space-y-4">
            {authMethod === 'email' && (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Loading..."
                    : isSignUp
                    ? "Create Account"
                    : "Sign In"}
                </Button>
              </form>
            )}

            {authMethod === 'phone' && (
              <div className="space-y-4">
                <Input
                  type="tel"
                  placeholder="Phone number (with country code)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                {!showOTPInput ? (
                  <>
                    <div id="recaptcha-container"></div>
                    <Button
                      onClick={handlePhoneAuth}
                      className="w-full"
                    >
                      Send OTP
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      type="text"
                      placeholder="Enter OTP"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    <Button
                      onClick={verifyOTP}
                      className="w-full"
                    >
                      Verify OTP
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full"
            >
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>
          </div>

          {authMethod === 'email' && (
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-gray-600 hover:text-accent"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Need an account? Sign up"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
