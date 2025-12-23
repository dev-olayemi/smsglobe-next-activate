import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

export const TransactionHealthCheck = () => {
  const { user, profile, verifyBalance, fixBalance } = useAuth();
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [healthData, setHealthData] = useState<{
    isValid: boolean;
    discrepancy: number;
    lastCheck?: Date;
  } | null>(null);

  const runHealthCheck = async () => {
    if (!user) return;

    setChecking(true);
    try {
      const result = await verifyBalance();
      setHealthData({
        isValid: result.isValid,
        discrepancy: result.discrepancy,
        lastCheck: new Date()
      });

      if (result.isValid) {
        toast.success("Balance verification passed!");
      } else {
        toast.warning(`Balance discrepancy detected: $${result.discrepancy.toFixed(2)}`);
      }
    } catch (error) {
      console.error("Health check failed:", error);
      toast.error("Health check failed");
    } finally {
      setChecking(false);
    }
  };

  const autoFixIssues = async () => {
    if (!user) return;

    setFixing(true);
    try {
      const result = await fixBalance();
      
      if (result.success) {
        toast.success("Balance issues fixed successfully!");
        // Re-run health check
        await runHealthCheck();
      } else {
        toast.error(result.error || "Failed to fix balance issues");
      }
    } catch (error) {
      console.error("Auto-fix failed:", error);
      toast.error("Auto-fix failed");
    } finally {
      setFixing(false);
    }
  };

  if (!user || !profile) {
    return null;
  }

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
            variant="outline" 
            onClick={runHealthCheck}
            disabled={checking}
            className="flex-1"
          >
            {checking ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Health Check
          </Button>
          
          {healthData && !healthData.isValid && (
            <Button 
              onClick={autoFixIssues}
              disabled={fixing}
              className="flex-1"
            >
              {fixing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Auto-Fix Issues
            </Button>
          )}
        </div>

        {healthData && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {healthData.isValid ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    All Good
                  </Badge>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <Badge variant="destructive">
                    Issues Found
                  </Badge>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Balance</span>
                <p className="font-bold text-lg">{formatCurrency(profile.balance || 0, 'USD')}</p>
              </div>
              {!healthData.isValid && (
                <div>
                  <span className="text-muted-foreground">Discrepancy</span>
                  <p className="font-bold text-lg text-red-600">
                    {formatCurrency(healthData.discrepancy, 'USD')}
                  </p>
                </div>
              )}
            </div>

            {!healthData.isValid && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Balance discrepancy detected:</strong> ${healthData.discrepancy.toFixed(2)}
                  <br />
                  Your profile balance doesn't match your transaction history.
                </AlertDescription>
              </Alert>
            )}

            {healthData.lastCheck && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Last checked: {healthData.lastCheck.toLocaleString()}
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Recommendations:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click "Auto-Fix Issues" to correct your balance</li>
                <li>Contact support if issues persist after auto-fix</li>
                <li>Run health checks regularly to catch issues early</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};