import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Mail, Key, Settings as SettingsIcon, Users, DollarSign, Copy } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [useCashbackFirst, setUseCashbackFirst] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);

  useEffect(() => {
    checkAuth();
    loadProfile();
  }, []);

  const checkAuth = async () => {
    const { session } = await auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  const loadProfile = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setUseCashbackFirst(data.use_cashback_first || false);
        setReferralCode(data.referral_code || "");
        setReferralCount(data.referral_count || 0);
        setReferralEarnings(Number(data.referral_earnings || 0));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({ use_cashback_first: useCashbackFirst })
        .eq("id", session.user.id);

      if (error) throw error;

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      const newApiKey = `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      const { error } = await supabase
        .from("profiles")
        .update({ api_key: newApiKey })
        .eq("id", session.user.id);

      if (error) throw error;

      setProfile({ ...profile, api_key: newApiKey });
      toast.success("API key generated successfully");
    } catch (error) {
      console.error("Error generating API key:", error);
      toast.error("Failed to generate API key");
    }
  };

  const copyReferralLink = () => {
    const referralUrl = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(referralUrl);
    toast.success("Referral link copied to clipboard!");
  };

  const copyReferralCodeOnly = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Profile & Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referral Program
                </CardTitle>
                <CardDescription>Invite friends and earn $1 for each signup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Your Referral Code</p>
                    <p className="text-2xl font-bold">{referralCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                    <p className="text-2xl font-bold">{referralCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="text-2xl font-bold flex items-center gap-1">
                      <DollarSign className="h-5 w-5" />
                      {referralEarnings.toFixed(2)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="referralLink">Referral Link</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="referralLink"
                        value={`${window.location.origin}/signup?ref=${referralCode}`}
                        readOnly
                      />
                      <Button onClick={copyReferralLink} variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="referralCodeOnly">Referral Code</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="referralCodeOnly"
                        value={referralCode}
                        readOnly
                      />
                      <Button onClick={copyReferralCodeOnly} variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>How it works:</strong> Share your referral code or link with friends. 
                      When they sign up using your code, you'll automatically receive $1.00 bonus 
                      added to your balance!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account Information
                </CardTitle>
                <CardDescription>Your basic account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input value={profile?.id || ""} disabled />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Access
                </CardTitle>
                <CardDescription>
                  Generate and manage your API key for programmatic access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value={profile?.api_key || "Not generated yet"}
                      disabled
                      className="flex-1 font-mono text-sm"
                    />
                    <Button onClick={generateApiKey} variant="outline">
                      {profile?.api_key ? "Regenerate" : "Generate"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Keep your API key secure. Don't share it with anyone.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Preferences
                </CardTitle>
                <CardDescription>Customize your account behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="cashback-first">Use Cashback First</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically use cashback balance before main balance
                    </p>
                  </div>
                  <Switch
                    id="cashback-first"
                    checked={useCashbackFirst}
                    onCheckedChange={setUseCashbackFirst}
                  />
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" disabled>
                  Delete Account
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Contact support to delete your account
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
