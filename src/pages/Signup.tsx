import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { auth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    auth.getSession().then(({ session }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
    
    // Check for referral code in URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signupSchema.parse({ email, password, confirmPassword });
      setLoading(true);

      const { data, error } = await auth.signUp(validated.email, validated.password);

      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        // Apply referral bonus if code provided
        if (referralCode.trim()) {
          try {
            const { data: bonusResult, error: bonusError } = await supabase.rpc(
              'apply_referral_bonus',
              { 
                referrer_code: referralCode.trim().toUpperCase(), 
                new_user_id: data.user.id 
              }
            );

            if (bonusError) {
              console.error("Referral error:", bonusError);
            } else if (bonusResult) {
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
        
        navigate("/dashboard");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="SMSGlobe" className="h-16" />
          </Link>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Get started with SMSGlobe today</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
