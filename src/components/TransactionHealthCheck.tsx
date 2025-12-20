import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { checkUserTransactionHealth, autoFixUserBalance, TransactionHealthReport } from "@/lib/transaction-monitor";
import { toast } from "sonner";

export const TransactionHealthCheck = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [healthReport, setHealthReport] = useState<TransactionHealthReport | null>(null);

  const runHealthCheck = async () => {
    if (!user) {
      toast.error("Please log in to run health check");
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 Running transaction health check...");
      const report = await checkUserTransactionHealth(user.uid);
      setHealthReport(report);
      
      if (report.isHealthy) {
        toast.success("Transaction health check passed!");
      } else {
        toast.warning(`Health check found ${report.issues.length} issue(s)`);
      }
    } catch (error) {
      console.error("Health check failed:", error);
      toast.error("Failed to run health check");
    } finally {
      setLoading(false);
    }
  };

  const autoFix = async () => {
    if (!user || !healthReport) return;

    setFixing(true);
    try {
      console.log("🔧 Running auto-fix...");
      const result = await autoFixUserBalance(user.uid);
      
      if (result.fixed) {
        toast.success(`Balance corrected: $${result.oldBalance.toFixed(2)} → $${result.newBalance.toFixed(2)}`);
        // Re-run health check to verify fix
        await runHealthCheck();
      } else if (result.error) {
        toast.error(`Auto-fix failed: ${result.error}`);
      } else {
        toast.info("No fixes needed - balance is already correct");
      }
    } catch (error) {
      console.error("Auto-fix failed:", error);
      toast.error("Failed to auto-fix balance");
    } finally {
      setFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Transaction Health Check
        </CardTitle>
        <CardDescription>
          Verify your account balance and transaction integrity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runHealthCheck} 
            disabled={loading || !user}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Run Health Check
              </>
            )}
          </Button>
          
          {healthReport && !healthReport.isHealthy && (
            <Button 
              onClick={autoFix} 
              disabled={fixing}
              variant="default"
            >
              {fixing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                "Auto-Fix Issues"
              )}
            </Button>
          )}
        </div>

        {healthReport && (
          <div className="space-y-4">
            {/* Health Status */}
            <div className="flex items-center gap-2">
              {healthReport.isHealthy ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="default" className="bg-green-500">Healthy</Badge>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <Badge variant="destructive">Issues Found</Badge>
                </>
              )}
            </div>

            {/* Balance Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-lg font-semibold">${healthReport.currentBalance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Calculated Balance</p>
                <p className="text-lg font-semibold">${healthReport.calculatedBalance.toFixed(2)}</p>
              </div>
            </div>

            {/* Discrepancy Alert */}
            {healthReport.discrepancy > 0.01 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Balance discrepancy detected: ${healthReport.discrepancy.toFixed(2)}
                  <br />
                  Your profile balance doesn't match your transaction history.
                </AlertDescription>
              </Alert>
            )}

            {/* Transaction Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Transactions</p>
                <p className="font-medium">{healthReport.transactionCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Transaction</p>
                <p className="font-medium">
                  {healthReport.lastTransactionDate 
                    ? healthReport.lastTransactionDate.toLocaleDateString()
                    : 'None'
                  }
                </p>
              </div>
            </div>

            {/* Issues List */}
            {healthReport.issues.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Issues Found:</p>
                <div className="space-y-1">
                  {healthReport.issues.map((issue, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertDescription className="text-sm">{issue}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {!healthReport.isHealthy && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Recommendations:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {healthReport.discrepancy > 0.01 && (
                    <li>• Click "Auto-Fix Issues" to correct your balance</li>
                  )}
                  <li>• Contact support if issues persist after auto-fix</li>
                  <li>• Run health checks regularly to catch issues early</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {!healthReport && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Click "Run Health Check" to verify your account integrity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};