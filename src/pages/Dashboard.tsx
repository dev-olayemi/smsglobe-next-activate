import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { ServicePicker } from "@/components/dashboard/ServicePicker";
import { ActiveActivations } from "@/components/dashboard/ActiveActivations";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [cashback, setCashback] = useState(0);
  const [activations, setActivations] = useState<any[]>([]);

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

  const handleBuyNumber = async (service: string, country: string) => {
    try {
      toast.info("Purchasing number...");
      // This will be implemented with edge functions
      toast.error("API integration coming soon!");
    } catch (error) {
      toast.error("Failed to purchase number");
    }
  };

  const handleCancelActivation = async (id: string) => {
    try {
      await supabase
        .from("activations")
        .update({ status: "cancelled" })
        .eq("id", id);
      
      toast.success("Activation cancelled");
      loadData();
    } catch (error) {
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

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <BalanceCard balance={balance} cashback={cashback} />
          <div className="md:col-span-2">
            <ServicePicker onBuyNumber={handleBuyNumber} />
          </div>
        </div>

        <ActiveActivations
          activations={activations}
          onCancel={handleCancelActivation}
          onRefresh={loadData}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
