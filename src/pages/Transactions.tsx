import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";
import { format } from "date-fns";

const Transactions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    loadTransactions();
  }, []);

  const checkAuth = async () => {
    const { session } = await auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  const loadTransactions = async () => {
    try {
      const { session } = await auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("balance_transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
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
      <main className="flex-1 container px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Transaction History</h1>
            <p className="text-muted-foreground">
              View all your balance transactions and deposits
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                All Transactions
              </CardTitle>
              <CardDescription>
                Complete history of your account activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Your transaction history will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 md:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 md:gap-4 flex-1">
                        <div className={`p-2 rounded-full shrink-0 ${
                          transaction.type === "deposit" 
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}>
                          {transaction.type === "deposit" ? (
                            <ArrowDownCircle className="h-4 w-4 md:h-5 md:w-5" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 md:h-5 md:w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{transaction.description}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {format(new Date(transaction.created_at), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className={`font-bold text-base md:text-lg ${
                          transaction.type === "deposit" 
                            ? "text-success"
                            : "text-destructive"
                        }`}>
                          {transaction.type === "deposit" ? "+" : "-"}
                          ${Number(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Balance: ${Number(transaction.balance_after).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Transactions;
