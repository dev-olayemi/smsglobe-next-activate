import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface TopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TopUpModal = ({ open, onOpenChange, onSuccess }: TopUpModalProps) => {
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

  // Fetch exchange rate when modal opens
  useEffect(() => {
    if (open) {
      fetchExchangeRate();
    }
  }, [open]);

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
        // Close the modal after opening payment
        onOpenChange(false);
        onSuccess();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Top Up Balance</DialogTitle>
          <DialogDescription>
            Add funds to your SMSGlobe account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Quick Amount Selection */}
          <div className="space-y-2">
            <Label>Select Amount (USD)</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant={amount === amt.toString() ? "default" : "outline"}
                  onClick={() => setAmount(amt.toString())}
                  className="w-full text-sm"
                  size="sm"
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount">Custom Amount (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">$</span>
              <Input
                id="custom-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                min="1"
                step="0.01"
              />
            </div>
          </div>

          {/* Exchange Rate & NGN Amount Display */}
          {amountNum > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Exchange Rate</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">1 USD = {formatCurrency(exchangeRate, 'NGN')}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={fetchExchangeRate}
                    disabled={loadingRate}
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingRate ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">You will pay</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(ngnAmount, 'NGN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Balance will receive</span>
                <span className="font-medium text-success">{formatCurrency(amountNum, 'USD')}</span>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              {paymentMethods.map((method) => (
                <div 
                  key={method.code} 
                  className={`flex items-center space-x-2 rounded-lg border p-3 transition-colors ${
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
                    className={`flex items-center gap-2 flex-1 ${method.available ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <method.icon className="h-4 w-4" />
                    <span>{method.name}</span>
                    {!method.available && (
                      <span className="text-xs text-muted-foreground ml-auto">Coming Soon</span>
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
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay {amountNum > 0 ? formatCurrency(ngnAmount, 'NGN') : '₦0.00'}</>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Balance will be credited as ${amountNum.toFixed(2)} USD after payment confirmation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
