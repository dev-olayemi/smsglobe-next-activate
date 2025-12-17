/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Bitcoin, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { firestoreService } from "@/lib/firestore-service";
import { getUsdToNgnRate, usdToNgn, formatCurrency } from "@/lib/currency";

// Type for FlutterwaveCheckout (global function)
declare global {
  interface Window {
    FlutterwaveCheckout: (config: any) => void;
  }
}

const TopUp = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("flutterwave");
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1550);
  const [loadingRate, setLoadingRate] = useState(false);

  const paymentMethods = [
    { code: "flutterwave", name: "Card / Bank / USSD", icon: CreditCard, available: true },
    { code: "crypto", name: "Cryptocurrency", icon: Bitcoin, available: false },
  ];

  const quickAmounts = [5, 10, 25, 50, 100, 250];

  // Load Flutterwave script once
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch exchange rate on mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    setLoadingRate(true);
    try {
      const result = await getUsdToNgnRate();
      setExchangeRate(result.rate);
    } catch (error) {
      console.error("Error fetching rate:", error);
    } finally {
      setLoadingRate(false);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const ngnAmount = usdToNgn(amountNum, exchangeRate);

  const handleTopUp = async () => {
    if (!amountNum || amountNum < 1) {
      toast.error("Please enter a valid amount (minimum $1)");
      return;
    }

    if (!user || !profile) {
      toast.error("Please log in to continue");
      return;
    }

    if (paymentMethod === "crypto") {
      toast.info("Crypto payments coming soon!");
      return;
    }

    setLoading(true);

    try {
      // Generate unique tx reference
      const txRef = `txn_${Date.now()}_${user.uid.slice(0, 8)}`;

      // Create pending deposit record (same as before)
      const depositId = await firestoreService.createDeposit({
        userId: user.uid,
        amountUSD: amountNum,
        amountNGN: ngnAmount,
        exchangeRate: exchangeRate,
        status: "pending",
        paymentMethod: "flutterwave",
        txRef: txRef,
      });

      // Flutterwave Inline Checkout (modal)
      if (typeof window.FlutterwaveCheckout === "function") {
        window.FlutterwaveCheckout({
          public_key: "FLWPUBK_TEST-fd0d29a75c03d4f19df73e0d6ac9fbfa-X", // Your test public key
          tx_ref: txRef,
          amount: ngnAmount,
          currency: "NGN",
          payment_options: "card,banktransfer,ussd",
          meta: {
            userId: user.uid,
            depositId: depositId,
            amountUSD: amountNum,
          },
          customer: {
            email: profile.email,
            name: profile.displayName || profile.email.split("@")[0],
          },
          customizations: {
            title: "SMSGlobe Top Up",
            description: `Add $${amountNum} to your balance`,
            logo: "https://smsglobe.lovable.app/favicon.png",
          },
          callback: (data: any) => {
            console.log("Payment response:", data);
            if (data.status === "successful" || data.status === "completed") {
              toast.success("Payment successful! Verifying transaction...");
              // Navigate to payment callback for proper verification and balance update
              const params = new URLSearchParams({
                transaction_id: String(data.transaction_id || ''),
                tx_ref: data.tx_ref || txRef,
                status: 'completed'
              });
              navigate(`/payment-callback?${params.toString()}`);
            } else {
              toast.error("Payment failed or incomplete.");
              setLoading(false);
            }
          },
          onclose: () => {
            toast.info("Payment cancelled.");
            setLoading(false);
          },
        });
      } else {
        throw new Error("Flutterwave script not loaded yet. Try again.");
      }
    } catch (error) {
      console.error("Top up error:", error);
      toast.error("Failed to start payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-12 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Top Up Your Balance</h1>
          <p className="text-muted-foreground">
            Add funds to your SMSGlobe account to purchase products instantly
          </p>
        </div>

        <div className="space-y-6 bg-card p-8 rounded-lg shadow-sm border">
          {/* Quick Amount Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select Amount (USD)</Label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant={amount === amt.toString() ? "default" : "outline"}
                  onClick={() => setAmount(amt.toString())}
                  className="w-full"
                  size="lg"
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="custom-amount" className="text-base font-medium">Or Enter Custom Amount (USD)</Label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-muted-foreground font-medium text-lg">$</span>
              <Input
                id="custom-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 h-12 text-lg"
                min="1"
                step="0.01"
              />
            </div>
          </div>

          {/* Exchange Rate & NGN Amount Display */}
          {amountNum > 0 && (
            <div className="p-6 rounded-lg bg-muted/50 border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Exchange Rate</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">1 USD = {formatCurrency(exchangeRate, 'NGN')}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={fetchExchangeRate}
                    disabled={loadingRate}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingRate ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">You will pay</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(ngnAmount, 'NGN')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Balance will receive</span>
                <span className="font-medium text-green-600">{formatCurrency(amountNum, 'USD')}</span>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              {paymentMethods.map((method) => (
                <div
                  key={method.code}
                  className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors ${
                    method.available
                      ? 'hover:bg-muted/50 cursor-pointer'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <RadioGroupItem
                    value={method.code}
                    id={method.code}
                    disabled={!method.available}
                  />
                  <Label
                    htmlFor={method.code}
                    className={`flex items-center gap-3 flex-1 ${method.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <method.icon className="h-5 w-5" />
                    <span className="font-medium">{method.name}</span>
                    {!method.available && (
                      <span className="text-sm text-muted-foreground ml-auto">Coming Soon</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleTopUp}
            disabled={!amount || amountNum < 1 || loading}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay {amountNum > 0 ? formatCurrency(ngnAmount, 'NGN') : '₦0.00'}</>
            )}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Secure payment powered by Flutterwave. Funds will be credited to your account immediately after payment confirmation.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TopUp;