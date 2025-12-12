import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { firestoreService } from "@/lib/firestore-service";
import { toast } from "sonner";
import { Loader2, User, Mail, Key, Settings as SettingsIcon, Users, DollarSign, Copy } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [useCashbackFirst, setUseCashbackFirst] = useState(profile?.useCashbackFirst || false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const referralCode = profile?.referralCode || "";
  const referralCount = profile?.referralCount || 0;
  const referralEarnings = profile?.referralEarnings || 0;

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await firestoreService.updateUserProfile(user.uid, { useCashbackFirst });
      await refreshProfile();
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
      const newApiKey = `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await firestoreService.updateUserProfile(user.uid, { apiKey: newApiKey });
      await refreshProfile();
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Profile & Settings</h1>
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
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Your Referral Code</p>
                    <p className="text-xl md:text-2xl font-bold break-all">{referralCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                    <p className="text-xl md:text-2xl font-bold">{referralCount}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2 md:col-span-1">
                    <p className="text-sm text-muted-foreground">Total Earned</p>
                    <p className="text-xl md:text-2xl font-bold flex items-center gap-1">
                      <DollarSign className="h-5 w-5" />
                      {referralEarnings.toFixed(2)}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="referralLink">Referral Link</Label>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <Input
                        id="referralLink"
                        value={`${window.location.origin}/signup?ref=${referralCode}`}
                        readOnly
                        className="flex-1"
                      />
                      <Button onClick={copyReferralLink} variant="outline" className="shrink-0">
                        <Copy className="h-4 w-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Copy Link</span>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="referralCodeOnly">Referral Code</Label>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                      <Input
                        id="referralCodeOnly"
                        value={referralCode}
                        readOnly
                        className="flex-1"
                      />
                      <Button onClick={copyReferralCodeOnly} variant="outline" className="shrink-0">
                        <Copy className="h-4 w-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Copy Code</span>
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
                      value={user.email || ""}
                      disabled
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input value={user.uid} disabled />
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value={profile?.apiKey || "Not generated yet"}
                      disabled
                      className="flex-1 font-mono text-sm"
                    />
                    <Button onClick={generateApiKey} variant="outline" className="shrink-0">
                      {profile?.apiKey ? "Regenerate" : "Generate"}
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
