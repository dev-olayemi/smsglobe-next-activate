import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Plus } from "lucide-react";

interface BalanceCardProps {
  balance: number;
  cashback: number;
}

export const BalanceCard = ({ balance, cashback }: BalanceCardProps) => {
  return (
    <Card className="border-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
        <Wallet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-3xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cashback: ${cashback.toFixed(2)}
            </p>
          </div>
          <Button className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Top Up Balance
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
