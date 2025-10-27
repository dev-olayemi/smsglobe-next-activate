import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, X, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { getServiceIcon, getCountryFlag } from "@/lib/service-icons";

interface Activation {
  id: string;
  phone_number: string;
  service: string;
  country_code: number;
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
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
          <div className="text-center py-12">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2">No active numbers</p>
            <p className="text-sm text-muted-foreground">
              Buy a number from the "Buy Number" tab to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activations.map((activation) => {
              const ServiceIcon = getServiceIcon(activation.service);
              const flag = getCountryFlag(activation.country_code.toString());
              
              return (
                <div
                  key={activation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <ServiceIcon className="h-5 w-5 text-primary" />
                        <span className="text-lg">{flag}</span>
                      </div>
                      <span className="font-mono font-semibold text-lg">{activation.phone_number}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(activation.phone_number)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="capitalize">{activation.service}</span>
                      <span>•</span>
                      <Badge variant="outline" className={getStatusColor(activation.status)}>
                        {activation.status}
                      </Badge>
                      <span>•</span>
                      <span>{formatTimeAgo(activation.created_at)}</span>
                    </div>
                    {activation.sms_code && (
                      <div className="flex items-center gap-2 mt-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                        <span className="text-sm font-medium text-success">Verification Code:</span>
                        <code className="bg-background px-3 py-1 rounded text-lg font-bold">
                          {activation.sms_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(activation.sms_code!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(activation.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
