import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Wallet, Bitcoin, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TopUpModal = ({ open, onOpenChange, onSuccess }: TopUpModalProps) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { code: "stripe", name: "Credit/Debit Card", icon: CreditCard },
    { code: "paypal", name: "PayPal", icon: Wallet },
    { code: "crypto", name: "Cryptocurrency", icon: Bitcoin },
    { code: "bank_transfer", name: "Bank Transfer", icon: Building },
  ];

  const quickAmounts = [10, 25, 50, 100, 250, 500];

  const handleTopUp = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 1) {
      toast.error("Please enter a valid amount (minimum $1)");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create deposit record
      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: amountNum,
        payment_method: paymentMethod,
        status: "pending",
      });

      if (error) throw error;

      // In production, this would redirect to payment gateway
      toast.success("Payment initiated! (Demo mode - balance updated)", {
        description: `$${amountNum.toFixed(2)} via ${paymentMethod}`,
      });

      // Demo: Update balance immediately
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({ balance: (profile?.balance || 0) + amountNum })
        .eq("id", user.id);

      onSuccess();
      onOpenChange(false);
      setAmount("");
    } catch (error) {
      console.error("Top up error:", error);
      toast.error("Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Balance</DialogTitle>
          <DialogDescription>
            Add funds to your SMSGlobe account to purchase virtual numbers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Select Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  variant={amount === amt.toString() ? "default" : "outline"}
                  onClick={() => setAmount(amt.toString())}
                  className="w-full"
                >
                  ${amt}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-amount">Custom Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
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

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              {paymentMethods.map((method) => (
                <div key={method.code} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={method.code} id={method.code} />
                  <Label
                    htmlFor={method.code}
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                  >
                    <method.icon className="h-4 w-4" />
                    <span>{method.name}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Button
            onClick={handleTopUp}
            disabled={!amount || loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Processing..." : `Add $${amount || "0.00"}`}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your balance will be available immediately after payment confirmation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
