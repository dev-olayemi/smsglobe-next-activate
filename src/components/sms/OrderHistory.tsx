import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Calendar,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SMSOrder } from '@/types/sms-types';
import { smsService } from '@/services/sms-service';

interface OrderHistoryProps {
  userId?: string;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ userId }) => {
  const [orders, setOrders] = useState<SMSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      loadOrders();
    }
  }, [userId]);

  const loadOrders = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const userOrders = await smsService.getUserOrders(userId);
      setOrders(userOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: SMSOrder['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SMSOrder['status']) => {
    switch (status) {
      case 'active':
        return <Phone className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'expired':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mr-3" />
            <span>Loading order history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Order History</h3>
            <p className="text-gray-600">You haven't placed any SMS orders yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Order History ({orders.length})</h2>
        <Button variant="outline" size="sm" onClick={loadOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {orders.map((order) => (
        <Card key={order.id} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="font-mono">{order.mdn || 'N/A'}</span>
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{order.service}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {order.price.toFixed(2)}
                  </span>
                  <span>•</span>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)}
                  <span className="ml-1 capitalize">{order.status}</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleOrderExpansion(order.id)}
                  className="h-8 w-8 p-0"
                >
                  {expandedOrders.has(order.id) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          {expandedOrders.has(order.id) && (
            <CardContent className="space-y-4 border-t bg-gray-50">
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Order Type:</span>
                  <p className="text-gray-600 capitalize">
                    {order.orderType === 'long-term' 
                      ? `${order.duration} day rental` 
                      : 'One-time use'
                    }
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">External ID:</span>
                  <p className="text-gray-600 font-mono text-xs">{order.externalId}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Base Price:</span>
                  <p className="text-gray-600">${order.basePrice.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Markup:</span>
                  <p className="text-gray-600">${order.markup.toFixed(2)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expires At:</span>
                  <p className="text-gray-600">{formatDate(order.expiresAt)}</p>
                </div>
                {order.completedAt && (
                  <div>
                    <span className="font-medium text-gray-700">Completed At:</span>
                    <p className="text-gray-600">{formatDate(order.completedAt)}</p>
                  </div>
                )}
              </div>

              {/* SMS Messages */}
              {order.smsMessages && order.smsMessages.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    SMS Messages ({order.smsMessages.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {order.smsMessages.map((message) => (
                      <div key={message.id} className="bg-white p-3 rounded-lg border">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            From: {message.from}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.dateTime).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{message.reply}</p>
                        {message.pin && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                            <span className="text-sm font-medium text-blue-800">
                              Verification Code: {message.pin}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Messages */}
              {(!order.smsMessages || order.smsMessages.length === 0) && (
                <div className="text-center py-4 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No SMS messages received</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};