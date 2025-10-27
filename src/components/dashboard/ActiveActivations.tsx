import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Activation {
  id: string;
  phone_number: string;
  service: string;
  status: string;
  sms_code?: string;
  created_at: string;
}

interface ActiveActivationsProps {
  activations: Activation[];
  onCancel: (id: string) => void;
  onRefresh: () => void;
}

export const ActiveActivations = ({ activations, onCancel, onRefresh }: ActiveActivationsProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500";
      case "completed":
        return "bg-success";
      case "cancelled":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Active Numbers</CardTitle>
          <CardDescription>Your currently active virtual numbers</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {activations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active numbers. Buy a number to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {activations.map((activation) => (
              <div
                key={activation.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{activation.phone_number}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(activation.phone_number)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{activation.service}</span>
                    <Badge variant="outline" className={getStatusColor(activation.status)}>
                      {activation.status}
                    </Badge>
                  </div>
                  {activation.sms_code && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm font-medium">Code:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {activation.sms_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(activation.sms_code!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(activation.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
