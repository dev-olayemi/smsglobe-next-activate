import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { firestoreService } from "@/lib/firestore-service";
import { formatCurrency } from "@/lib/currency";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [amountUSD, setAmountUSD] = useState(0);
  const [amountNGN, setAmountNGN] = useState(0);

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
      // Verify payment with Flutterwave via edge function
      const { data, error } = await supabase.functions.invoke("flutterwave-verify", {
        body: { transaction_id: transactionId, tx_ref: txRef },
      });

      if (error) throw error;

      if (data.status === "success" && data.verified) {
        const paymentData = data.data;
        
        // Update Firebase with the payment
        if (user && paymentData.depositId) {
          try {
            // Complete the deposit in Firebase
            const newBalance = await firestoreService.completeDeposit(
              paymentData.depositId,
              user.uid,
              paymentData.amountUSD,
              paymentData.transactionId
            );

            // Refresh the user profile
            await refreshProfile();

            setStatus("success");
            setAmountUSD(paymentData.amountUSD);
            setAmountNGN(paymentData.amountNGN);
            setMessage(`Successfully added ${formatCurrency(paymentData.amountUSD, 'USD')} to your balance`);
            toast.success("Payment successful!");
          } catch (firebaseError) {
            console.error("Firebase update error:", firebaseError);
            // Payment verified but Firebase update failed
            setStatus("success");
            setAmountUSD(paymentData.amountUSD);
            setMessage("Payment verified! Your balance will be updated shortly.");
            toast.warning("Payment verified. Balance updating...");
          }
        } else {
          // No user logged in or no deposit ID
          setStatus("success");
          setAmountUSD(paymentData.amountUSD || 0);
          setMessage("Payment verified successfully");
        }
      } else if (data.status === "already_processed") {
        setStatus("success");
        setMessage(data.message || "This payment has already been processed");
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
      <main className="flex-1 container px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
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
                  {amountUSD > 0 && (
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-primary">
                        +{formatCurrency(amountUSD, 'USD')}
                      </p>
                      {amountNGN > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Paid: {formatCurrency(amountNGN, 'NGN')}
                        </p>
                      )}
                    </div>
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
