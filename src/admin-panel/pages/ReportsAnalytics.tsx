import { useEffect, useState } from 'react';
import { adminService } from '../lib/admin-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { Loader2, BarChart3, TrendingUp, Users, DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';
import { formatStatsAmount } from '../lib/currency-utils';

export function ReportsAnalytics() {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getRevenueData(parseInt(timeRange));
      setRevenueData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getAnalyticsStats = () => {
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = revenueData.reduce((sum, item) => sum + item.orders, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const bestDay = revenueData.reduce((best, current) => 
      current.revenue > (best?.revenue || 0) ? current : best, null);

    return { totalRevenue, totalOrders, avgOrderValue, bestDay };
  };

  const stats = getAnalyticsStats();

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
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business insights and performance metrics</p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStatsAmount(stats.totalRevenue).primary}</div>
            <div className="text-xs text-muted-foreground">{formatStatsAmount(stats.totalRevenue).secondary}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange} days
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStatsAmount(stats.avgOrderValue).primary}</div>
            <div className="text-xs text-muted-foreground">{formatStatsAmount(stats.avgOrderValue).secondary}</div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Day</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatStatsAmount(stats.bestDay?.revenue || 0).primary}</div>
            <div className="text-xs text-muted-foreground">{formatStatsAmount(stats.bestDay?.revenue || 0).secondary}</div>
            <p className="text-xs text-muted-foreground">
              {stats.bestDay?.date || 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
          <CardDescription>Daily revenue and order volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenueData} />
        </CardContent>
      </Card>

      {/* Additional Analytics Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>Best selling products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Product analytics coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Insights</CardTitle>
            <CardDescription>User behavior and engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Customer analytics coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}