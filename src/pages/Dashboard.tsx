import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { DynamicServicePicker } from "@/components/dashboard/DynamicServicePicker";
import { FeatureSelector } from "@/components/dashboard/FeatureSelector";
import { TopUpModal } from "@/components/dashboard/TopUpModal";
import { ActiveActivations } from "@/components/dashboard/ActiveActivations";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, History, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [cashback, setCashback] = useState(0);
  const [activations, setActivations] = useState<any[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [activationType, setActivationType] = useState("activation");

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { session } = await auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
  };

  const loadData = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      // Load profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setBalance(Number(profile.balance || 0));
        setCashback(Number(profile.cashback || 0));
      }

      // Load activations
      const { data: activationsData } = await supabase
        .from("activations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (activationsData) {
        setActivations(activationsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNumber = async (service: string, country: string, price: number, type: string, days?: number) => {
    try {
      // Check if user has sufficient balance
      if (balance < price) {
        toast.error(
          `Insufficient balance. You need $${price.toFixed(2)} but have $${balance.toFixed(2)}`,
          {
            action: {
              label: "Top Up",
              onClick: () => setShowTopUp(true),
            },
          }
        );
        return;
      }

      toast.info("Purchasing number...");
      
      const { data, error } = await supabase.functions.invoke("sms-buy-number", {
        body: { service, country, type, rental_days: days },
      });

      if (error) {
        // Handle specific API errors
        if (error.message === "NO_BALANCE") {
          toast.error(
            "Platform balance is low. Please contact support or try again later.",
            {
              duration: 6000,
            }
          );
        } else if (error.message.includes("NO_NUMBERS")) {
          toast.error("No numbers available for this service/country combination. Please try another country.");
        } else {
          toast.error(`Failed to purchase: ${error.message}`);
        }
        return;
      }

      // Deduct from user balance
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ balance: balance - price })
          .eq("id", user.id);
      }

      toast.success(`Number purchased: ${data.phone_number}`);
      loadData();
    } catch (error) {
      console.error("Error buying number:", error);
      toast.error("Failed to purchase number. Please try again.");
    }
  };

  const handleCancelActivation = async (id: string) => {
    try {
      // Find activation
      const activation = activations.find((a) => a.id === id);
      if (!activation) return;

      // Cancel via API
      await supabase.functions.invoke("sms-cancel", {
        body: { activation_id: activation.activation_id },
      });

      toast.success("Activation cancelled");
      loadData();
    } catch (error) {
      console.error("Error cancelling:", error);
      toast.error("Failed to cancel activation");
    }
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your virtual numbers and account
          </p>
        </div>

        <Tabs defaultValue="buy" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="buy">Buy Number</TabsTrigger>
            <TabsTrigger value="active">Active ({activations.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <BalanceCard balance={balance} cashback={cashback} onTopUp={() => setShowTopUp(true)} />
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                  <CardDescription>Your account overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-2xl font-bold">$0.00</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Active Numbers</p>
                      <p className="text-2xl font-bold">{activations.length}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">100%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <FeatureSelector
              selectedFeature={activationType}
              onFeatureChange={setActivationType}
            >
              <DynamicServicePicker 
                onBuyNumber={handleBuyNumber}
                activationType={activationType}
              />
            </FeatureSelector>
          </TabsContent>

          <TabsContent value="active">
            <ActiveActivations
              activations={activations}
              onCancel={handleCancelActivation}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Transaction History
                </CardTitle>
                <CardDescription>View your past activations and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No transaction history yet. Buy your first number to get started!
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      
      <TopUpModal
        open={showTopUp}
        onOpenChange={setShowTopUp}
        onSuccess={loadData}
      />
    </div>
  );
};

export default Dashboard;
