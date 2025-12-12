import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { DynamicServicePicker } from "@/components/dashboard/DynamicServicePicker";
import { FeatureSelector } from "@/components/dashboard/FeatureSelector";
import { TopUpModal } from "@/components/dashboard/TopUpModal";
import { ActiveActivations } from "@/components/dashboard/ActiveActivations";
import { useAuth } from "@/lib/auth-context";
import { firestoreService } from "@/lib/firestore-service";
import { toast } from "sonner";
import { Loader2, History, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activations, setActivations] = useState<any[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [activationType, setActivationType] = useState("activation");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
      } else {
        loadData();
      }
    }
  }, [user, authLoading, navigate]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load activations
      const userActivations = await firestoreService.getUserActivations(user.uid);
      setActivations(userActivations);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNumber = async (service: string, country: string, price: number, type: string, days?: number) => {
    const balance = profile?.balance || 0;
    
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

    toast.info("Purchasing number... (SMS API not connected yet)");
    // TODO: Implement SMS API integration when ready
  };

  const handleCancelActivation = async (id: string) => {
    try {
      await firestoreService.updateActivation(id, { status: 'cancelled' });
      toast.success("Activation cancelled");
      loadData();
    } catch (error) {
      console.error("Error cancelling:", error);
      toast.error("Failed to cancel activation");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = profile?.balance || 0;
  const cashback = 0; // Cashback feature can be added later

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your virtual numbers and account
          </p>
        </div>

        <Tabs defaultValue="buy" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 h-auto">
            <TabsTrigger value="buy" className="text-xs sm:text-sm">Buy Number</TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">Active ({activations.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 md:grid-cols-3">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-xl md:text-2xl font-bold">$0.00</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Active Numbers</p>
                      <p className="text-xl md:text-2xl font-bold">{activations.length}</p>
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-xl md:text-2xl font-bold">100%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <FeatureSelector
                  selectedFeature={activationType}
                  onFeatureChange={setActivationType}
                >
                  <DynamicServicePicker 
                    onBuyNumber={handleBuyNumber}
                    activationType={activationType}
                  />
                </FeatureSelector>
              </CardContent>
            </Card>
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
        onSuccess={() => {
          refreshProfile();
          loadData();
        }}
      />
    </div>
  );
};

export default Dashboard;
