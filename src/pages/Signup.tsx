import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { firebaseAuthService } from "@/lib/firebase-auth";
import { firestoreService } from "@/lib/firestore-service";
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { z } from "zod";
import ReCAPTCHA from "react-google-recaptcha";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username max 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Only letters, numbers, and underscores"
    ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const PRODUCTION_DOMAINS = [
  "smsglobe.net",
  "smsglobe-test.vercel.app",
];

const isProduction = () => {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return (
    PRODUCTION_DOMAINS.includes(hostname) ||
    (hostname.endsWith(".vercel.app") && protocol === "https:")
  );
};

const Signup = () => {
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const siteKey = import.meta.env.VITE_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    const user = firebaseAuthService.getCurrentUser();
    if (user) {
      navigate("/dashboard");
    }

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [navigate]);

  // Username availability check
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const available = await firestoreService.checkUsernameAvailable(username);
      setUsernameAvailable(available);
      setCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  // Username suggestions from email
  useEffect(() => {
    if (email && email.includes("@")) {
      const suggestions = firestoreService.generateUsernameSuggestions(email);
      setUsernameSuggestions(suggestions);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = signupSchema.parse({
        email,
        username,
        password,
        confirmPassword,
      });

      // reCAPTCHA check in production
      let recaptchaToken = "";
      if (isProduction() && siteKey) {
        if (!recaptchaRef.current) {
          toast.error("reCAPTCHA not loaded");
          return;
        }
        recaptchaToken = await recaptchaRef.current.executeAsync() || "";
        if (!recaptchaToken) {
          toast.error("Please complete the reCAPTCHA");
          return;
        }
        recaptchaRef.current.reset();
      }

      setLoading(true);

      const { user, error } = await firebaseAuthService.signUp(
        validated.email,
        validated.password,
        validated.username,
        recaptchaToken // pass token to your auth service (optional – you can verify on backend later)
      );

      if (error) {
        toast.error(error);
      } else if (user) {
        if (referralCode.trim()) {
          try {
            const success = await firestoreService.applyReferralCode(
              user.uid,
              referralCode.trim().toUpperCase()
            );
            if (success) {
              toast.success("Account created! Your referrer received a $1 bonus.");
            } else {
              toast.success("Account created successfully!");
            }
          } catch (err) {
            console.error("Referral application error:", err);
            toast.success("Account created successfully!");
          }
        } else {
          toast.success("Account created successfully!");
        }

        // After signup, redirect to stored path if present (post-auth redirect)
        try {
          const redirect = localStorage.getItem('post_auth_redirect');
          if (redirect) {
            localStorage.removeItem('post_auth_redirect');
            navigate(redirect);
          } else {
            navigate("/dashboard");
          }
        } catch (e) {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const { user, error } = await firebaseAuthService.signInWithGoogle();

      if (error) {
        toast.error(error);
      } else if (user) {
        if (referralCode.trim()) {
          try {
            await firestoreService.applyReferralCode(
              user.uid,
              referralCode.trim().toUpperCase()
            );
          } catch (err) {
            console.error("Referral error:", err);
          }
        }
        toast.success("Welcome to SMSGlobe!");
        // After Google signup, redirect to stored path if present
        try {
          const redirect = localStorage.getItem('post_auth_redirect');
          if (redirect) {
            localStorage.removeItem('post_auth_redirect');
            navigate(redirect);
          } else {
            navigate("/dashboard");
          }
        } catch (e) {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast.error("Failed to sign up with Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md border">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="SMSGlobe" className="h-16" />
          </Link>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Get started with SMSGlobe today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) =>
                    setUsername(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                    )
                  }
                  required
                  className={`pr-10 ${
                    usernameAvailable === true
                      ? "border-green-500"
                      : usernameAvailable === false
                      ? "border-destructive"
                      : ""
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
              {usernameAvailable === false && (
                <p className="text-xs text-destructive">
                  Username is already taken
                </p>
              )}
              {usernameSuggestions.length > 0 && !username && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Suggestions:
                  </span>
                  {usernameSuggestions.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setUsername(suggestion)}
                      className="text-xs text-primary hover:underline"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code (Optional)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                disabled={loading}
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Have a referral code? Your referrer will get $1 bonus!
              </p>
            </div>

            {/* reCAPTCHA - only in production */}
            {isProduction() && siteKey && (
              <div className="flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={siteKey}
                  size="normal"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || usernameAvailable === false}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;