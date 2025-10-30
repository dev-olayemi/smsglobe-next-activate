import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    const transactionId = searchParams.get("transaction_id");
    const txRef = searchParams.get("tx_ref");
    const statusParam = searchParams.get("status");

    if (!transactionId && !txRef) {
      setStatus("failed");
      setMessage("No transaction ID found");
      return;
    }

    if (statusParam === "cancelled") {
      setStatus("failed");
      setMessage("Payment was cancelled");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("flutterwave-verify", {
        body: { transaction_id: transactionId || txRef },
      });

      if (error) throw error;

      if (data.status === "success") {
        setStatus("success");
        setAmount(data.amount);
        setMessage(`Successfully added $${data.amount.toFixed(2)} to your balance`);
        toast.success("Payment successful!");
      } else if (data.status === "already_processed") {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("failed");
        setMessage(data.message || "Payment verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("failed");
      setMessage("An error occurred while verifying your payment");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === "loading" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="text-muted-foreground text-center">
                  Verifying your payment...
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Payment Successful!</h3>
                  <p className="text-muted-foreground">{message}</p>
                  {amount > 0 && (
                    <p className="text-2xl font-bold text-primary">
                      +${amount.toFixed(2)}
                    </p>
                  )}
                </div>
                <Button onClick={() => navigate("/dashboard")} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            )}

            {status === "failed" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <XCircle className="h-16 w-16 text-destructive" />
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Payment Failed</h3>
                  <p className="text-muted-foreground">{message}</p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
                    Go Back
                  </Button>
                  <Button onClick={() => window.location.reload()} className="flex-1">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCallback;
