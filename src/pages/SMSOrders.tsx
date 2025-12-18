/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { smsService } from "@/lib/sms-service";
import { firestoreService, SMSOrder } from "@/lib/firestore-service";
import { SMSService } from "@/lib/tellabot-api";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Search,
  MessageSquare,
  Smartphone,
  Clock,
  RefreshCw,
  Copy,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Timer,
  Inbox,
  ArrowRight,
  Zap,
} from "lucide-react";

const SMSPage = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  // State
  const [services, setServices] = useState<SMSService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<string>("");
  const [orderType, setOrderType] = useState<"one-time" | "long-term">("one-time");
  const [rentalDays, setRentalDays] = useState<3 | 7 | 14 | 30>(7);
  const [searchQuery, setSearchQuery] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  // Active orders
  const [activeOrders, setActiveOrders] = useState<SMSOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [pollingOrder, setPollingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Load services
  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const data = await smsService.getServices();
      setServices(data);
    } catch (error: any) {
      console.error("Error loading services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Load active orders
  const loadActiveOrders = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const orders = await firestoreService.getActiveSMSOrders(user.uid);
      setActiveOrders(orders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  }, [user]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (user) {
      loadActiveOrders();
    }
  }, [user, loadActiveOrders]);

  // Calculate price
  const getPrice = () => {
    const service = services.find((s) => s.name === selectedService);
    if (!service) return { base: 0, markup: 0 };

    if (orderType === "one-time") {
      return { base: service.basePrice, markup: service.markupPrice };
    } else {
      // Long-term pricing based on duration
      const ltrBase = service.ltrPrice || service.basePrice * 10;
      const ltrMarkup = service.ltrMarkupPrice || ltrBase * 1.5;
      const dailyRate = ltrMarkup / 30;
      return { base: ltrBase * (rentalDays / 30), markup: dailyRate * rentalDays };
    }
  };

  // Purchase handler
  const handlePurchase = async () => {
    if (!user || !profile || !selectedService) return;

    const { markup, base } = getPrice();

    if (profile.balance < markup) {
      toast.error(`Insufficient balance. You need ${formatCurrency(markup, "USD")}`, {
        action: {
          label: "Top Up",
          onClick: () => navigate("/top-up"),
        },
      });
      return;
    }

    setPurchasing(true);
    try {
      let result;
      if (orderType === "one-time") {
        result = await smsService.purchaseOneTimeSMS(
          user.uid,
          profile.email,
          profile.username,
          selectedService,
          markup,
          base
        );
      } else {
        result = await smsService.purchaseLTR(
          user.uid,
          profile.email,
          profile.username,
          selectedService,
          rentalDays,
          markup,
          base
        );
      }

      if (result.success) {
        toast.success(`SMS number purchased successfully!`, {
          description: result.mdn ? `Number: ${result.mdn}` : "Awaiting number assignment...",
        });
        refreshProfile();
        loadActiveOrders();
        setSelectedService("");

        // Start polling if awaiting MDN
        if (result.orderId && result.status === "awaiting_mdn") {
          setPollingOrder(result.orderId);
        }
      } else {
        toast.error(result.error || "Failed to purchase");
      }
    } catch (error: any) {
      toast.error(error.message || "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  // Poll for SMS messages
  const pollMessages = async (order: SMSOrder) => {
    try {
      const messages = await smsService.getMessages(order);
      if (messages.length > 0) {
        toast.success(`New SMS received!`, {
          description: messages[0].pin ? `PIN: ${messages[0].pin}` : messages[0].text.substring(0, 50),
        });
        loadActiveOrders();
      }
      return messages;
    } catch (error) {
      console.error("Error polling messages:", error);
      return [];
    }
  };

  // Refresh order status
  const refreshOrder = async (orderId: string) => {
    try {
      const updated = await smsService.refreshOrderStatus(orderId);
      if (updated) {
        loadActiveOrders();
        if (updated.mdn && updated.status !== "awaiting_mdn") {
          toast.success(`Number assigned: ${updated.mdn}`);
        }
      }
    } catch (error) {
      console.error("Error refreshing order:", error);
    }
  };

  // Cancel order
  const cancelOrder = async (orderId: string) => {
    try {
      const result = await smsService.cancelOrder(orderId);
      if (result.success) {
        toast.success("Order cancelled");
        loadActiveOrders();
      } else {
        toast.error(result.error || "Failed to cancel");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Copy number to clipboard
  const copyNumber = (mdn: string) => {
    navigator.clipboard.writeText(mdn);
    toast.success("Number copied to clipboard");
  };

  // Filter services
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const balance = profile?.balance || 0;
  const { markup: price } = getPrice();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white">
          <div className="container px-4 py-12">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="h-10 w-10" />
              <h1 className="text-3xl md:text-4xl font-bold">SMS Verification</h1>
            </div>
            <p className="text-lg text-blue-100 max-w-2xl">
              Get temporary phone numbers for SMS verification. Receive codes instantly.
            </p>
            <div className="mt-6 flex items-center gap-4 flex-wrap">
              <div className="bg-white/10 rounded-lg px-4 py-2">
                <span className="text-sm text-blue-200">Your Balance:</span>
                <span className="ml-2 font-bold">{formatCurrency(balance, "USD")}</span>
              </div>
              <Button variant="secondary" onClick={() => navigate("/top-up")}>
                Top Up Balance
              </Button>
            </div>
          </div>
        </div>

        <div className="container px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Order Form */}
            <div className="lg:col-span-2">
              <Tabs value={orderType} onValueChange={(v) => setOrderType(v as any)}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="one-time" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    One-Time SMS
                  </TabsTrigger>
                  <TabsTrigger value="long-term" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Long-Term Rental
                  </TabsTrigger>
                </TabsList>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>
                      {orderType === "one-time" ? "Get Verification Code" : "Rent Number"}
                    </CardTitle>
                    <CardDescription>
                      {orderType === "one-time"
                        ? "Receive a single SMS verification code"
                        : `Rent a number for ${rentalDays} days`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Service Search */}
                    <div className="space-y-2">
                      <Label>Select Service</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search services (e.g. Google, WhatsApp)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Service Grid */}
                    <div className="max-h-[300px] overflow-y-auto">
                      {loadingServices ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-lg" />
                          ))}
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No services found
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {filteredServices.slice(0, 30).map((service) => (
                            <button
                              key={service.name}
                              onClick={() => setSelectedService(service.name)}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                selectedService === service.name
                                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                                  : "border-border hover:border-primary/50 hover:bg-muted/50"
                              }`}
                            >
                              <div className="font-medium text-sm truncate">{service.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatCurrency(service.markupPrice, "USD")}
                              </div>
                              {service.available > 0 && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {service.available} avail
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rental Duration (for long-term) */}
                    {orderType === "long-term" && (
                      <div className="space-y-2">
                        <Label>Rental Duration</Label>
                        <Select
                          value={rentalDays.toString()}
                          onValueChange={(v) => setRentalDays(parseInt(v) as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 Days</SelectItem>
                            <SelectItem value="7">7 Days</SelectItem>
                            <SelectItem value="14">14 Days</SelectItem>
                            <SelectItem value="30">30 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Price Summary */}
                    {selectedService && (
                      <div className="rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service:</span>
                          <span className="font-medium">{selectedService}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium capitalize">
                            {orderType === "one-time" ? "One-time" : `${rentalDays}-day rental`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-medium">Total:</span>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(price, "USD")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Purchase Button */}
                    <Button
                      onClick={handlePurchase}
                      disabled={!selectedService || purchasing || balance < price}
                      className="w-full h-12"
                      size="lg"
                    >
                      {purchasing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : balance < price ? (
                        "Insufficient Balance"
                      ) : (
                        <>
                          <Smartphone className="mr-2 h-4 w-4" />
                          Get Number Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </Tabs>
            </div>

            {/* Right: Active Orders */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg sticky top-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Inbox className="h-5 w-5" />
                      Active Orders
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadActiveOrders}
                      disabled={loadingOrders}
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                      ))}
                    </div>
                  ) : activeOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">No active orders</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Purchase a number to get started
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeOrders.map((order) => (
                        <SMSOrderCard
                          key={order.id}
                          order={order}
                          onRefresh={() => refreshOrder(order.id)}
                          onCancel={() => cancelOrder(order.id)}
                          onPollMessages={() => pollMessages(order)}
                          onCopy={copyNumber}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// SMS Order Card Component
interface SMSOrderCardProps {
  order: SMSOrder;
  onRefresh: () => void;
  onCancel: () => void;
  onPollMessages: () => Promise<any[]>;
  onCopy: (mdn: string) => void;
}

const SMSOrderCard = ({ order, onRefresh, onCancel, onPollMessages, onCopy }: SMSOrderCardProps) => {
  const [polling, setPolling] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "reserved":
        return "bg-green-100 text-green-800";
      case "awaiting_mdn":
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
      case "rejected":
      case "timed_out":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "reserved":
        return <CheckCircle className="h-4 w-4" />;
      case "awaiting_mdn":
      case "pending":
        return <Timer className="h-4 w-4" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handlePollMessages = async () => {
    setPolling(true);
    const msgs = await onPollMessages();
    setMessages(msgs);
    setPolling(false);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{order.service}</div>
        <Badge className={getStatusColor(order.status)}>
          {getStatusIcon(order.status)}
          <span className="ml-1 capitalize">{order.status.replace("_", " ")}</span>
        </Badge>
      </div>

      {order.mdn ? (
        <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-lg font-bold">{order.mdn}</span>
          <Button variant="ghost" size="sm" onClick={() => onCopy(order.mdn!)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Alert>
          <Timer className="h-4 w-4" />
          <AlertDescription>Waiting for number assignment...</AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className="rounded bg-green-50 border border-green-200 p-3">
              <div className="text-xs text-muted-foreground mb-1">From: {msg.from}</div>
              <div className="text-sm">{msg.text}</div>
              {msg.pin && (
                <div className="mt-2 font-mono text-lg font-bold text-green-700">
                  PIN: {msg.pin}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {order.mdn && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePollMessages}
            disabled={polling}
            className="flex-1"
          >
            {polling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
            <span className="ml-2">Check SMS</span>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        {["awaiting_mdn", "reserved", "pending"].includes(order.status) && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-destructive">
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {order.orderType === "long-term" ? `${order.duration}-day rental` : "One-time"} •{" "}
        {formatCurrency(order.price, "USD")}
      </div>
    </div>
  );
};

export default SMSPage;
