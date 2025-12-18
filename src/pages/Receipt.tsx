/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Receipt as ReceiptIcon } from "lucide-react";
import { firestoreService } from "@/lib/firestore-service";
import { formatCurrency } from "@/lib/currency";

export default function Receipt() {
  const { txRef = "" } = useParams<{ txRef: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deposit, setDeposit] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (txRef ? `Receipt • ${txRef}` : "Receipt"), [txRef]);

  useEffect(() => {
    document.title = `SMSGlobe Receipt | ${title}`.slice(0, 60);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "View your SMSGlobe payment receipt and deposit details.");
  }, [title]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!txRef) {
        setError("Missing transaction reference");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [dep, pay] = await Promise.all([
          firestoreService.getDepositByTxRef(txRef),
          firestoreService.getPaymentByTxRef(txRef),
        ]);

        if (!mounted) return;
        setDeposit(dep);
        setPayment(pay);

        if (!dep && !pay) {
          setError("Receipt not found");
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load receipt");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [txRef]);

  const status = (payment?.status || deposit?.status || "unknown") as string;
  const amountUSD = Number(payment?.amountUSD ?? deposit?.amountUSD ?? 0);
  const amountNGN = Number(payment?.amountNGN ?? deposit?.amountNGN ?? 0);
  const exchangeRate = Number(payment?.exchangeRate ?? deposit?.exchangeRate ?? 0);
  const transactionId = String(payment?.transactionId ?? deposit?.transactionId ?? "");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-8">
        <header className="max-w-2xl mx-auto mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ReceiptIcon className="h-6 w-6 text-primary" />
            Payment Receipt
          </h1>
          <p className="text-muted-foreground mt-1">Receipt and deposit details for your top up.</p>
        </header>

        <section className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">Receipt Details</CardTitle>
              <Badge variant={status === "completed" ? "default" : status === "pending" ? "secondary" : "destructive"}>
                {status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="py-6 text-center space-y-3">
                  <p className="font-medium">{error}</p>
                  <p className="text-sm text-muted-foreground">If you just paid, refresh this page in a few seconds.</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                      Refresh
                    </Button>
                    <Button asChild>
                      <Link to="/transactions">Go to transactions</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Transaction reference</span>
                      <span className="text-sm font-medium truncate" title={txRef}>
                        {txRef}
                      </span>
                    </div>
                    {transactionId ? (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">Transaction ID</span>
                        <span className="text-sm font-medium">{transactionId}</span>
                      </div>
                    ) : null}
                  </div>

                  <Separator />

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Paid (NGN)</span>
                      <span className="text-sm font-semibold">{formatCurrency(amountNGN, "NGN")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Credited (USD)</span>
                      <span className="text-sm font-semibold text-primary">{formatCurrency(amountUSD, "USD")}</span>
                    </div>
                    {exchangeRate ? (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">Exchange rate</span>
                        <span className="text-sm font-medium">1 USD = {formatCurrency(exchangeRate, "NGN")}</span>
                      </div>
                    ) : null}
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button className="sm:flex-1" onClick={() => navigate("/dashboard")}>
                      Continue
                    </Button>
                    <Button className="sm:flex-1" variant="outline" asChild>
                      <Link to="/transactions">View history</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
