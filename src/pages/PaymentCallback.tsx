/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import firestoreApi from "@/lib/firestoreApi";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { firestoreService } from "@/lib/firestore-service";
import { formatCurrency } from "@/lib/currency";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile, profile, setProfileLocal } = useAuth();
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

    if (!txRef) {
      setStatus("failed");
      setMessage("Missing transaction reference (tx_ref)");
      return;
    }

    if (statusParam === "cancelled") {
      setStatus("failed");
      setMessage("Payment was cancelled");
      return;
    }

    try {
      setStatus("loading");
      setMessage("");

      const { data, error } = await firestoreApi.invokeFunction("flutterwave-verify", {
        transaction_id: transactionId,
        tx_ref: txRef,
      });

      if (error) {
        throw new Error(error?.message || "Payment verification failed");
      }

      if (data?.status !== "success") {
        throw new Error(data?.message || "Payment verification failed");
      }

      const creditedUSD = Number(data?.receipt?.amountUSD ?? 0);
      const paidNGN = Number(data?.receipt?.amountNGN ?? 0);
      const newBalanceUSD = typeof data?.newBalanceUSD === "number" ? data.newBalanceUSD : undefined;

      setAmountUSD(creditedUSD);
      setAmountNGN(paidNGN);
      setStatus("success");
      setMessage(
        data?.message ||
          (creditedUSD > 0
            ? `Successfully added ${formatCurrency(creditedUSD, "USD")} to your balance`
            : "Payment verified successfully")
      );

      // Update UI immediately (Header balance), then refresh from DB
      if (typeof newBalanceUSD === "number" && typeof setProfileLocal === "function" && profile) {
        setProfileLocal({ ...(profile as any), balance: newBalanceUSD });
      }

      try {
        await refreshProfile();
      } catch {
        // ignore
      }

      toast.success(
        creditedUSD > 0
          ? `${formatCurrency(creditedUSD, "USD")} has been added to your balance`
          : "Payment verified",
        {
          action: {
            label: "View receipt",
            onClick: () => navigate(`/receipt/${txRef}`),
          },
        }
      );
    } catch (err: any) {
      console.error("Verification error:", err);
      setStatus("failed");
      setMessage(err?.message || "An error occurred while verifying your payment");
      toast.error(err?.message || "Payment verification failed");
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
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/receipt/${searchParams.get("tx_ref") || ""}`)}
                    className="flex-1"
                  >
                    View receipt
                  </Button>
                  <Button
                    onClick={() => {
                      const redirectPath = localStorage.getItem("post_auth_redirect");
                      if (redirectPath) {
                        localStorage.removeItem("post_auth_redirect");
                        navigate(redirectPath);
                      } else {
                        navigate("/dashboard");
                      }
                    }}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </div>
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
