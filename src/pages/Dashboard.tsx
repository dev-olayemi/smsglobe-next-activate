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
import { firestoreService, BalanceTransaction } from "@/lib/firestore-service";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Loader2, History, TrendingUp, ShoppingCart, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activations, setActivations] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
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
      const [userActivations, userTransactions] = await Promise.all([
        firestoreService.getUserActivations(user.uid),
        firestoreService.getUserTransactions(user.uid),
      ]);
      setActivations(userActivations);
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNumber = async (service: string, country: string, price: number, type: string, days?: number) => {
    const balance = profile?.balance || 0;
    
    if (balance < price) {
      toast.error(
        `Insufficient balance. You need ${formatCurrency(price, 'USD')} but have ${formatCurrency(balance, 'USD')}`,
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
  const cashback = profile?.cashback || 0;

  // Calculate stats from transactions
  const totalSpent = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDeposited = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const completedActivations = activations.filter(a => a.status === 'completed').length;
  const successRate = activations.length > 0 
    ? Math.round((completedActivations / activations.length) * 100) 
    : 100;

  // Get recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5);

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
                    <TrendingUp className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                  <CardDescription>Your account overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Deposited</p>
                      <p className="text-lg md:text-xl font-bold text-success">{formatCurrency(totalDeposited, 'USD')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Total Spent</p>
                      <p className="text-lg md:text-xl font-bold">{formatCurrency(totalSpent, 'USD')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Active Numbers</p>
                      <p className="text-lg md:text-xl font-bold">{activations.filter(a => a.status === 'active' || a.status === 'waiting').length}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-lg md:text-xl font-bold">{successRate}%</p>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Transactions
                  </CardTitle>
                  <CardDescription>Your latest account activity</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/transactions")}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Add funds to get started!</p>
                    <Button className="mt-4" onClick={() => setShowTopUp(true)}>
                      Add Funds
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            tx.type === 'deposit' || tx.type === 'referral_bonus'
                              ? 'bg-success/10 text-success'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {tx.type === 'deposit' ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : tx.type === 'purchase' ? (
                              <ShoppingCart className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.createdAt?.toDate 
                                ? format(tx.createdAt.toDate(), "MMM dd, h:mm a")
                                : ''
                              }
                            </p>
                          </div>
                        </div>
                        <p className={`font-bold ${
                          tx.type === 'deposit' || tx.type === 'referral_bonus'
                            ? 'text-success'
                            : 'text-destructive'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'referral_bonus' ? '+' : '-'}
                          {formatCurrency(tx.amount, 'USD')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
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
