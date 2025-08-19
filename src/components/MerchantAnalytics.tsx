import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, DollarSign, Users, ShoppingBag, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  totalSales: number;
  totalCustomers: number;
  totalCashback: number;
  averageOrderValue: number;
  recentTransactions: any[];
  topDeals: any[];
}

interface MerchantAnalyticsProps {
  merchantId: string;
}

export default function MerchantAnalytics({ merchantId }: MerchantAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalSales: 0,
    totalCustomers: 0,
    totalCashback: 0,
    averageOrderValue: 0,
    recentTransactions: [],
    topDeals: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [merchantId]);

  const loadAnalyticsData = async () => {
    try {
      // For demo purposes, we'll show mock data
      // In a real implementation, this would query actual transaction data
      const mockData: AnalyticsData = {
        totalSales: 15420,
        totalCustomers: 234,
        totalCashback: 1250,
        averageOrderValue: 65.90,
        recentTransactions: [
          { id: '1', customer: 'John D.', amount: 45.50, cashback: 2.28, date: '2024-01-20' },
          { id: '2', customer: 'Sarah M.', amount: 78.20, cashback: 3.91, date: '2024-01-20' },
          { id: '3', customer: 'Mike T.', amount: 32.40, cashback: 1.62, date: '2024-01-19' },
          { id: '4', customer: 'Lisa K.', amount: 95.80, cashback: 4.79, date: '2024-01-19' },
          { id: '5', customer: 'David L.', amount: 54.30, cashback: 2.72, date: '2024-01-18' },
        ],
        topDeals: [
          { title: 'Weekend Special', grabs: 45, revenue: 2340 },
          { title: 'Happy Hour', grabs: 32, revenue: 1680 },
          { title: 'Student Discount', grabs: 28, revenue: 1120 },
        ]
      };

      setAnalytics(mockData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Track your merchant performance and customer engagement
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashback Paid</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalCashback}</div>
            <p className="text-xs text-muted-foreground">
              8.1% of total sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.averageOrderValue}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{transaction.customer}</p>
                  <p className="text-sm text-muted-foreground">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${transaction.amount}</p>
                  <p className="text-sm text-green-600">${transaction.cashback} cashback</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topDeals.map((deal, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{deal.title}</p>
                  <p className="text-sm text-muted-foreground">{deal.grabs} grabs</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${deal.revenue}</p>
                  <Badge variant="secondary">#{index + 1}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}