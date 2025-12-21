import { useEffect, useState } from 'react';
import { adminService } from '../lib/admin-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Edit, CheckCircle, Clock, Package, Smartphone, Shield, Server, MessageSquare, Eye, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatStatsAmount } from '../lib/currency-utils';

interface ProductOrder {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  productId: string;
  productName: string;
  category: 'esim' | 'proxy' | 'rdp' | 'vpn' | 'sms';
  provider: string;
  quantity: number;
  price: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
  updatedAt: Date;
  adminNotes?: string;
  fulfillmentData?: any;
}

// Fulfillment form component for different product types
function FulfillmentForm({ order, onSubmit, loading }: {
  order: ProductOrder;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<any>({});

  const handleSubmit = () => {
    onSubmit(formData);
  };

  switch (order.category) {
    case 'esim':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">eSIM Fulfillment Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>QR Code Image URL *</Label>
              <Input
                value={formData.qrCodeUrl || ''}
                onChange={(e) => setFormData({ ...formData, qrCodeUrl: e.target.value })}
                placeholder="https://example.com/qr-code.png"
              />
            </div>
            <div className="space-y-2">
              <Label>Activation Code *</Label>
              <Input
                value={formData.activationCode || ''}
                onChange={(e) => setFormData({ ...formData, activationCode: e.target.value })}
                placeholder="Enter activation code"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ICCID</Label>
              <Input
                value={formData.iccid || ''}
                onChange={(e) => setFormData({ ...formData, iccid: e.target.value })}
                placeholder="Enter ICCID"
              />
            </div>
            <div className="space-y-2">
              <Label>PIN/PUK</Label>
              <Input
                value={formData.pin || ''}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                placeholder="Enter PIN/PUK"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Setup Instructions</Label>
            <Textarea
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Step-by-step setup instructions"
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Validity Period</Label>
            <Input
              value={formData.validityPeriod || ''}
              onChange={(e) => setFormData({ ...formData, validityPeriod: e.target.value })}
              placeholder="e.g., 30 days from activation"
            />
          </div>
          
          <Button onClick={handleSubmit} disabled={loading || !formData.qrCodeUrl || !formData.activationCode}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Fulfill eSIM Order
          </Button>
        </div>
      );

    case 'proxy':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Proxy Fulfillment Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proxy IP Address *</Label>
              <Input
                value={formData.ipAddress || ''}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Port *</Label>
              <Input
                value={formData.port || ''}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                placeholder="8080"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={formData.protocol || ''} onValueChange={(value) => setFormData({ ...formData, protocol: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                  <SelectItem value="SOCKS5">SOCKS5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., USA, UK"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Usage Instructions</Label>
            <Textarea
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="How to configure and use the proxy"
              rows={4}
            />
          </div>
          
          <Button onClick={handleSubmit} disabled={loading || !formData.ipAddress || !formData.port || !formData.username || !formData.password}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Fulfill Proxy Order
          </Button>
        </div>
      );

    case 'rdp':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">RDP Fulfillment Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Server IP Address *</Label>
              <Input
                value={formData.serverIp || ''}
                onChange={(e) => setFormData({ ...formData, serverIp: e.target.value })}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label>RDP Port *</Label>
              <Input
                value={formData.rdpPort || '3389'}
                onChange={(e) => setFormData({ ...formData, rdpPort: e.target.value })}
                placeholder="3389"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operating System</Label>
              <Input
                value={formData.operatingSystem || ''}
                onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
                placeholder="Windows Server 2019"
              />
            </div>
            <div className="space-y-2">
              <Label>Server Location</Label>
              <Input
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., USA, Germany"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Server Specifications</Label>
            <Textarea
              value={formData.specifications || ''}
              onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
              placeholder="RAM, CPU, Storage details"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Connection Instructions</Label>
            <Textarea
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="How to connect to the RDP server"
              rows={4}
            />
          </div>
          
          <Button onClick={handleSubmit} disabled={loading || !formData.serverIp || !formData.username || !formData.password}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Fulfill RDP Order
          </Button>
        </div>
      );

    case 'vpn':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">VPN Fulfillment Data</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Username *</Label>
              <Input
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Enter VPN username"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Password *</Label>
              <Input
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter VPN password"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Server Address</Label>
              <Input
                value={formData.serverAddress || ''}
                onChange={(e) => setFormData({ ...formData, serverAddress: e.target.value })}
                placeholder="vpn.example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={formData.protocol || ''} onValueChange={(value) => setFormData({ ...formData, protocol: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OpenVPN">OpenVPN</SelectItem>
                  <SelectItem value="WireGuard">WireGuard</SelectItem>
                  <SelectItem value="IKEv2">IKEv2</SelectItem>
                  <SelectItem value="L2TP">L2TP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Configuration File URL</Label>
            <Input
              value={formData.configFileUrl || ''}
              onChange={(e) => setFormData({ ...formData, configFileUrl: e.target.value })}
              placeholder="https://example.com/config.ovpn"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Setup Instructions</Label>
            <Textarea
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="How to setup and use the VPN"
              rows={4}
            />
          </div>
          
          <Button onClick={handleSubmit} disabled={loading || !formData.username || !formData.password}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Fulfill VPN Order
          </Button>
        </div>
      );

    case 'sms':
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">SMS Service - Automated</h3>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              SMS services are automatically provisioned via API. No manual fulfillment required.
              The service is activated immediately upon payment confirmation.
            </p>
          </div>
          
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Mark as Auto-Fulfilled
          </Button>
        </div>
      );

    default:
      return <div>Fulfillment form not available for this product type.</div>;
  }
}

export function OrdersManagement() {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [fulfillmentDialogOpen, setFulfillmentDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Form state for status update
  const [statusForm, setStatusForm] = useState({
    status: '',
    adminNotes: ''
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await adminService.getAllOrders();
      setOrders(ordersData as ProductOrder[]);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && order.category === activeTab;
  });

  const getOrderStats = () => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return { totalOrders, pendingOrders, processingOrders, completedOrders, totalRevenue };
  };

  const stats = getOrderStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'esim': return <Smartphone className="h-4 w-4" />;
      case 'proxy': return <Shield className="h-4 w-4" />;
      case 'rdp': return <Server className="h-4 w-4" />;
      case 'vpn': return <Shield className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const openDetailsDialog = (order: ProductOrder) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  const openStatusDialog = (order: ProductOrder) => {
    setSelectedOrder(order);
    setStatusForm({
      status: order.status,
      adminNotes: order.adminNotes || ''
    });
    setStatusDialogOpen(true);
  };

  const openFulfillmentDialog = (order: ProductOrder) => {
    setSelectedOrder(order);
    setFulfillmentDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;

    try {
      setActionLoading(true);
      await adminService.updateOrderStatus(selectedOrder.id, statusForm.status, statusForm.adminNotes);
      toast.success('Order status updated successfully');
      
      // Update local state
      setOrders(orders => orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: statusForm.status as any, adminNotes: statusForm.adminNotes }
          : o
      ));
      
      setStatusDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfillOrder = async (fulfillmentData: any) => {
    if (!selectedOrder) return;

    try {
      setActionLoading(true);
      
      // Update order with fulfillment data and mark as completed
      await adminService.updateOrderStatus(selectedOrder.id, 'completed', 'Order fulfilled with product data');
      
      // In a real implementation, you'd also save the fulfillment data
      // await adminService.updateOrderFulfillment(selectedOrder.id, fulfillmentData);
      
      toast.success('Order fulfilled successfully');
      
      // Update local state
      setOrders(orders => orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: 'completed', fulfillmentData, adminNotes: 'Order fulfilled with product data' }
          : o
      ));
      
      setFulfillmentDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error fulfilling order:', error);
      toast.error('Failed to fulfill order');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">Manage product orders and fulfillment</p>
        </div>
        <Button onClick={loadOrders} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStatsAmount(stats.totalRevenue).primary}</div>
            <div className="text-xs text-muted-foreground">{formatStatsAmount(stats.totalRevenue).secondary}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Order Search</CardTitle>
          <CardDescription>Search orders by order number, user email, or product name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Orders by Category</CardTitle>
          <CardDescription>Manage orders by product type</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="esim">eSIM</TabsTrigger>
              <TabsTrigger value="proxy">Proxy</TabsTrigger>
              <TabsTrigger value="rdp">RDP</TabsTrigger>
              <TabsTrigger value="vpn">VPN</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              {getCategoryIcon(order.category)}
                              <span className="ml-1">{order.category.toUpperCase()}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.productName}</div>
                            <div className="text-sm text-muted-foreground">{order.provider}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{order.userEmail}</div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatStatsAmount(order.totalAmount).primary}</div>
                            <div className="text-xs text-muted-foreground">{formatStatsAmount(order.totalAmount).secondary}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailsDialog(order)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openStatusDialog(order)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {(order.status === 'pending' || order.status === 'processing') && order.category !== 'sms' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openFulfillmentDialog(order)}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete information for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Order Information</Label>
                  <div className="text-sm space-y-1">
                    <div><strong>Order #:</strong> {selectedOrder.orderNumber}</div>
                    <div><strong>Category:</strong> {selectedOrder.category.toUpperCase()}</div>
                    <div><strong>Status:</strong> {selectedOrder.status}</div>
                    <div><strong>Payment:</strong> {selectedOrder.paymentStatus}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Product Details</Label>
                  <div className="text-sm space-y-1">
                    <div><strong>Product:</strong> {selectedOrder.productName}</div>
                    <div><strong>Provider:</strong> {selectedOrder.provider}</div>
                    <div><strong>Quantity:</strong> {selectedOrder.quantity}</div>
                    <div><strong>Price:</strong> {formatStatsAmount(selectedOrder.price).primary}</div>
                    <div><strong>Total:</strong> {formatStatsAmount(selectedOrder.totalAmount).primary}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Customer</Label>
                <div className="text-sm">
                  <div><strong>Email:</strong> {selectedOrder.userEmail}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dates</Label>
                <div className="text-sm space-y-1">
                  <div><strong>Created:</strong> {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}</div>
                  <div><strong>Updated:</strong> {selectedOrder.updatedAt ? new Date(selectedOrder.updatedAt).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
              
              {selectedOrder.adminNotes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Admin Notes</Label>
                  <div className="text-sm p-2 bg-gray-50 rounded">
                    {selectedOrder.adminNotes}
                  </div>
                </div>
              )}
              
              {selectedOrder.fulfillmentData && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Fulfillment Data</Label>
                  <div className="text-sm p-2 bg-green-50 rounded">
                    <pre>{JSON.stringify(selectedOrder.fulfillmentData, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Update the status for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusForm.status} onValueChange={(value) => setStatusForm({ ...statusForm, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                value={statusForm.adminNotes}
                onChange={(e) => setStatusForm({ ...statusForm, adminNotes: e.target.value })}
                placeholder="Add notes about this status update..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              disabled={actionLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fulfillment Dialog */}
      <Dialog open={fulfillmentDialogOpen} onOpenChange={setFulfillmentDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Fulfill Order</DialogTitle>
            <DialogDescription>
              Provide the product data for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-[70vh] overflow-y-auto">
            {selectedOrder && (
              <FulfillmentForm
                order={selectedOrder}
                onSubmit={handleFulfillOrder}
                loading={actionLoading}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFulfillmentDialogOpen(false)}
              disabled={actionLoading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}