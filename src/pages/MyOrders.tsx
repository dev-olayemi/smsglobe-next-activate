import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { firestoreService, ProductOrder, ProductCategory } from "@/lib/firestore-service";
import { toast } from "sonner";
import { Loader2, Package, Clock, CheckCircle, XCircle, AlertCircle, Copy, Wifi, Globe, Shield, Monitor, Gift } from "lucide-react";

const categoryIcons: Record<ProductCategory, React.ReactNode> = {
  esim: <Wifi className="h-4 w-4" />,
  proxy: <Globe className="h-4 w-4" />,
  vpn: <Shield className="h-4 w-4" />,
  rdp: <Monitor className="h-4 w-4" />,
  gift: <Gift className="h-4 w-4" />,
};

const statusConfig = {
  pending: { icon: Clock, label: "Pending", color: "bg-yellow-500" },
  processing: { icon: AlertCircle, label: "Processing", color: "bg-blue-500" },
  completed: { icon: CheckCircle, label: "Completed", color: "bg-green-500" },
  cancelled: { icon: XCircle, label: "Cancelled", color: "bg-red-500" },
  refunded: { icon: XCircle, label: "Refunded", color: "bg-orange-500" },
};

const MyOrders = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await firestoreService.getUserProductOrders(user.uid);
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const filteredOrders = activeTab === "all" 
    ? orders 
    : orders.filter(o => o.status === activeTab);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">My Orders</h1>
              <p className="text-muted-foreground">
                Track your product orders and access delivery details
              </p>
            </div>
            <Button onClick={() => navigate("/marketplace")}>
              Browse Products
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent p-0">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All ({orders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="pending"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Pending ({orders.filter(o => o.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger 
                value="processing"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Processing ({orders.filter(o => o.status === 'processing').length})
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Completed ({orders.filter(o => o.status === 'completed').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No orders found. Start shopping in the marketplace!
                    </p>
                    <Button className="mt-4" onClick={() => navigate("/marketplace")}>
                      Browse Products
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const status = statusConfig[order.status];
                    const StatusIcon = status.icon;

                    return (
                      <Card key={order.id}>
                        <CardHeader className="pb-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-muted rounded-lg">
                                {categoryIcons[order.category]}
                              </div>
                              <div>
                                <CardTitle className="text-lg">{order.productName}</CardTitle>
                                <CardDescription className="text-xs">
                                  Order ID: {order.id.slice(0, 8)}...
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`${status.color} text-white`}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                              <span className="font-bold">${order.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            Ordered: {formatDate(order.createdAt)}
                          </div>

                          {/* Delivery Details (when completed) */}
                          {order.status === 'completed' && order.deliveryDetails && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-green-800 dark:text-green-200">
                                  Delivery Details
                                </h4>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => copyToClipboard(order.deliveryDetails!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                              <pre className="text-sm bg-white dark:bg-background p-3 rounded border whitespace-pre-wrap break-all">
                                {order.deliveryDetails}
                              </pre>
                            </div>
                          )}

                          {/* Processing/Pending message */}
                          {(order.status === 'pending' || order.status === 'processing') && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                {order.status === 'pending' 
                                  ? "Your order is pending. Our team will process it shortly."
                                  : "Your order is being processed. You'll receive the details soon."}
                              </p>
                            </div>
                          )}

                          {/* Admin notes */}
                          {order.adminNotes && (
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm">
                                <strong>Note:</strong> {order.adminNotes}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyOrders;
