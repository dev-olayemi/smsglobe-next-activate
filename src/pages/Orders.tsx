import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { firestoreService, ProductOrder } from "@/lib/firestore-service";
import { formatCurrency } from "@/lib/currency";
import { 
  Loader2, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Eye,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Settings,
  FileText,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Orders = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
      } else {
        loadOrders();
      }
    }
  }, [user, authLoading, navigate]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      const userOrders = await firestoreService.getUserProductOrders(user.uid);
      setOrders(userOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'refunded':
        return 'bg-orange-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const pendingOrders = orders.filter(order => order.status === 'pending' || order.status === 'processing');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const otherOrders = orders.filter(order => !['pending', 'processing', 'completed'].includes(order.status));

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track your eSIM, VPN, Proxy, and RDP orders
            </p>
          </div>

          <Tabs defaultValue="pending" className="space-y-4 sm:space-y-6">
            <div className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto bg-white shadow-sm">
                <TabsTrigger value="pending" className="text-xs sm:text-sm py-3 px-2 sm:px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <div className="flex flex-col items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Pending</span>
                    <Badge variant="secondary" className="text-xs">{pendingOrders.length}</Badge>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm py-3 px-2 sm:px-4 data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                  <div className="flex flex-col items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Completed</span>
                    <Badge variant="secondary" className="text-xs">{completedOrders.length}</Badge>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm py-3 px-2 sm:px-4 data-[state=active]:bg-gray-50 data-[state=active]:text-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>All Orders</span>
                    <Badge variant="secondary" className="text-xs">{orders.length}</Badge>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Pending Orders */}
            <TabsContent value="pending" className="space-y-3 sm:space-y-4">
              {pendingOrders.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-8 sm:py-12 text-center px-4">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-blue-50 rounded-full">
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-base sm:text-lg">No Pending Orders</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          You don't have any pending orders at the moment. Browse our marketplace to get started.
                        </p>
                      </div>
                      <Button onClick={() => navigate("/marketplace")} className="mt-4">
                        Browse Products
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Completed Orders */}
            <TabsContent value="completed" className="space-y-3 sm:space-y-4">
              {completedOrders.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-8 sm:py-12 text-center px-4">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-green-50 rounded-full">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-base sm:text-lg">No Completed Orders</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Your completed orders will appear here once they're fulfilled.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* All Orders */}
            <TabsContent value="all" className="space-y-3 sm:space-y-4">
              {orders.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-8 sm:py-12 text-center px-4">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-gray-50 rounded-full">
                        <Package className="h-8 w-8 text-gray-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-base sm:text-lg">No Orders Yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Start by browsing our marketplace for eSIMs, VPNs, Proxies, and more.
                        </p>
                      </div>
                      <Button onClick={() => navigate("/marketplace")} className="mt-4">
                        Browse Products
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onViewDetails }: { order: ProductOrder; onViewDetails: (order: ProductOrder) => void }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'processing':
        return 'bg-blue-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      case 'refunded':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-yellow-500 text-white';
    }
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 border-0 shadow-sm bg-white">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base truncate">{order.productName}</h3>
                <Badge className={`${getStatusColor(order.status)} text-xs px-2 py-1`}>
                  {order.status}
                </Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  #{order.id.slice(-8)}
                </span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(order.price, 'USD')}
                </span>
                <span>
                  {order.createdAt?.toDate 
                    ? format(order.createdAt.toDate(), "MMM dd, yyyy")
                    : 'Date unavailable'
                  }
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(order)}
              className="flex-shrink-0"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </div>

          {/* Details */}
          {order.requestDetails && (
            <div className="pt-3 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {order.requestDetails.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{order.requestDetails.location}</span>
                  </div>
                )}
                {order.requestDetails.duration && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{order.requestDetails.duration}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ 
  order, 
  onClose, 
  onCopy 
}: { 
  order: ProductOrder; 
  onClose: () => void;
  onCopy: (text: string) => void;
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg sm:text-xl">Order Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              ✕
            </Button>
          </div>
          <CardDescription className="text-sm">
            Order #{order.id.slice(-8)} • {order.productName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {/* Order Status */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant="secondary" className={`${order.status === 'completed' ? 'bg-green-500' : order.status === 'processing' ? 'bg-blue-500' : 'bg-yellow-500'} text-white w-fit`}>
              {order.status}
            </Badge>
          </div>

          <Separator />

          {/* Request Details */}
          {order.requestDetails && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm sm:text-base">Your Request</h4>
              {order.requestDetails.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">Location:</span>
                    <p className="text-sm text-muted-foreground break-words">{order.requestDetails.location}</p>
                  </div>
                </div>
              )}
              {order.requestDetails.duration && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">Duration:</span>
                    <p className="text-sm text-muted-foreground break-words">{order.requestDetails.duration}</p>
                  </div>
                </div>
              )}
              {order.requestDetails.specifications && (
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">Specifications:</span>
                    <p className="text-sm text-muted-foreground break-words">{order.requestDetails.specifications}</p>
                  </div>
                </div>
              )}
              {order.requestDetails.additionalNotes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">Additional Notes:</span>
                    <p className="text-sm text-muted-foreground break-words">{order.requestDetails.additionalNotes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Response */}
          {order.status === 'completed' && order.adminResponse && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium text-green-600 text-sm sm:text-base">✅ Order Completed</h4>
                
                {order.adminResponse.credentials && (
                  <div className="p-3 sm:p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Access Credentials</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onCopy(order.adminResponse!.credentials!)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="text-xs sm:text-sm bg-background p-2 rounded block break-all">
                      {order.adminResponse.credentials}
                    </code>
                  </div>
                )}

                {order.adminResponse.instructions && (
                  <div>
                    <span className="text-sm font-medium">Instructions:</span>
                    <p className="text-sm text-muted-foreground mt-1 break-words">{order.adminResponse.instructions}</p>
                  </div>
                )}

                {order.adminResponse.downloadLinks && order.adminResponse.downloadLinks.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Download Links:</span>
                    <div className="mt-2 space-y-1">
                      {order.adminResponse.downloadLinks.map((link, index) => (
                        <Button 
                          key={index}
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(link, '_blank')}
                          className="w-full sm:w-auto text-xs sm:text-sm"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Download {index + 1}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {order.adminResponse.expiryDate && (
                  <div>
                    <span className="text-sm font-medium">Expires:</span>
                    <p className="text-sm text-muted-foreground break-words">{order.adminResponse.expiryDate}</p>
                  </div>
                )}

                {order.adminResponse.supportContact && (
                  <div>
                    <span className="text-sm font-medium">Support Contact:</span>
                    <p className="text-sm text-muted-foreground break-words">{order.adminResponse.supportContact}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Pending Message */}
          {(order.status === 'pending' || order.status === 'processing') && (
            <>
              <Separator />
              <div className="text-center py-4">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-yellow-500" />
                <h4 className="font-medium text-sm sm:text-base">Order Being Processed</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Your order is being processed. You'll receive your access details within 24 hours.
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Order Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Order Date:</span>
              <p className="font-medium break-words">
                {order.createdAt?.toDate 
                  ? format(order.createdAt.toDate(), "PPP")
                  : 'Date unavailable'
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Amount Paid:</span>
              <p className="font-medium">{formatCurrency(order.price, 'USD')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;