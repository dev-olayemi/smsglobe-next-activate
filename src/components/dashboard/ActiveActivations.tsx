import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, X, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import { getServiceLogo, getCountryData } from "@/lib/service-data";

interface Activation {
  id: string;
  phone_number: string;
  service: string;
  country_code: number;
  activation_type: string;
  status: string;
  sms_code?: string;
  created_at: string;
  rental_days?: number;
  is_voice?: boolean;
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
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
      case "completed":
        return "bg-success/20 text-success";
      case "cancelled":
        return "bg-destructive/20 text-destructive";
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
              const countryInfo = getCountryData(activation.country_code.toString());
              
              return (
                <div
                  key={activation.id}
                  className="group relative flex items-center gap-4 p-5 border-2 rounded-xl hover:border-primary/50 hover:shadow-lg transition-all bg-card"
                >
                  {/* Service & Country Icons */}
                  <div className="flex items-center gap-2">
                    <img 
                      src={getServiceLogo(activation.service)}
                      alt={activation.service}
                      className="h-10 w-10 object-contain"
                    />
                    <img 
                      src={countryInfo.flag}
                      alt={countryInfo.name}
                      className="h-8 w-10 object-cover rounded shadow-sm"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg">{activation.phone_number}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(activation.phone_number)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className={getStatusColor(activation.status)}>
                        {activation.status}
                      </Badge>
                      {activation.activation_type && activation.activation_type !== "standard" && (
                        <Badge variant="secondary">
                          {activation.activation_type}
                          {activation.rental_days && ` - ${activation.rental_days}d`}
                        </Badge>
                      )}
                      {activation.is_voice && (
                        <Badge variant="secondary">Voice</Badge>
                      )}
                      <span className="text-muted-foreground">{formatTimeAgo(activation.created_at)}</span>
                    </div>
                    
                    {activation.sms_code && (
                      <div className="flex items-center gap-3 mt-3 p-4 bg-success/10 border-2 border-success/20 rounded-lg">
                        <div className="flex-1">
                          <p className="text-xs text-success font-medium mb-1">VERIFICATION CODE</p>
                          <code className="text-2xl font-bold tracking-wider">
                            {activation.sms_code}
                          </code>
                        </div>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => copyToClipboard(activation.sms_code!)}
                          className="border-success/50 hover:bg-success/10"
                        >
                          <Copy className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(activation.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 absolute top-3 right-3"
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
