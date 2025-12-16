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
import firestoreApi from "@/lib/firestoreApi";

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

  // Fetch exchange rate on component mount
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
      // Generate unique transaction reference
      const txRef = `txn_${Date.now()}_${user.uid.slice(0, 8)}`;

      // Create deposit record in Firebase
      const depositId = await firestoreService.createDeposit({
        userId: user.uid,
        amountUSD: amountNum,
        amountNGN: ngnAmount,
        exchangeRate: exchangeRate,
        status: 'pending',
        paymentMethod: 'flutterwave',
        txRef: txRef,
      });

      // Initialize Flutterwave payment via edge function
      const { data, error } = await firestoreApi.invokeFunction("flutterwave-initialize", {
        amount: ngnAmount,
        amountUSD: amountNum,
        email: profile.email,
        txRef: txRef,
        userId: user.uid,
        depositId: depositId,
        currency: 'NGN',
      });

      if (error) throw error;

      if (data?.payment_link) {
        toast.success("Opening payment gateway in a new tab...");
        // open in new tab so user can return to app easily
        window.open(data.payment_link, "_blank");

        // Check for post-auth redirect and navigate back
        const redirectPath = localStorage.getItem('post_auth_redirect');
        if (redirectPath) {
          localStorage.removeItem('post_auth_redirect');
          navigate(redirectPath);
        } else {
          navigate('/dashboard');
        }
      } else {
        throw new Error("No payment link received");
      }
    } catch (error) {
      console.error("Top up error:", error);
      // If the error comes from invokeFunction it may include helpful details
      const err = error as any;
      if (err && err.url) {
        toast.error(`Failed to contact payment endpoint (${err.url}). Check emulator or functions deployment.`);
      } else if (err && err.message) {
        toast.error(err.message);
      } else {
        toast.error("Failed to initiate payment. Please try again.");
      }
    } finally {
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
