import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, 
  DollarSign, 
  Users, 
  TrendingUp, 
  QrCode, 
  Tag,
  Bell,
  Settings
} from "lucide-react";

interface MerchantInfo {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
}

interface DashboardStats {
  active_deals: number;
  total_grabs: number;
  pending_validations: number;
  total_revenue: number;
}

interface RecentGrab {
  id: string;
  created_at: string;
  status: string;
  deal_title: string;
  user_email: string;
}

export default function MerchantDashboard() {
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    active_deals: 0,
    total_grabs: 0,
    pending_validations: 0,
    total_revenue: 0
  });
  const [recentGrabs, setRecentGrabs] = useState<RecentGrab[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMerchantData();
  }, []);

  const loadMerchantData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get merchant info
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id, name, category, is_active')
        .eq('owner_id', user.id)
        .single();

      if (merchantError) throw merchantError;
      setMerchant(merchantData);

      if (merchantData) {
        // Get active deals count
        const { count: dealsCount } = await supabase
          .from('deals')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', merchantData.id)
          .eq('is_active', true);

        // Get total grabs
        const { count: grabsCount } = await supabase
          .from('grabs')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', merchantData.id);

        // Get pending validations
        const { count: pendingCount } = await supabase
          .from('grabs')
          .select('*', { count: 'exact', head: true })
          .eq('merchant_id', merchantData.id)
          .eq('status', 'LOCKED');

        // Get recent grabs
        const { data: grabsData } = await supabase
          .from('grabs')
          .select(`
            id,
            created_at,
            status,
            deals!inner(title),
            users!inner(email)
          `)
          .eq('merchant_id', merchantData.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const recentGrabsData = grabsData?.map(grab => ({
          id: grab.id,
          created_at: grab.created_at,
          status: grab.status,
          deal_title: (grab.deals as any)?.title || 'Unknown Deal',
          user_email: (grab.users as any)?.email || 'Unknown User'
        })) || [];

        setStats({
          active_deals: dealsCount || 0,
          total_grabs: grabsCount || 0,
          pending_validations: pendingCount || 0,
          total_revenue: 0 // This would need actual transaction data
        });
        setRecentGrabs(recentGrabsData);
      }
    } catch (error) {
      toast({
        title: "Error loading dashboard",
        description: "Could not load merchant dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOCKED':
        return <Badge variant="secondary">Pending</Badge>;
      case 'REDEEMED':
        return <Badge className="bg-green-100 text-green-800">Redeemed</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto text-center py-12">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Merchant Account Found</h2>
          <p className="text-muted-foreground">
            You need to register as a merchant to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Store className="h-8 w-8" />
              {merchant.name}
            </h1>
            <p className="text-muted-foreground capitalize">
              {merchant.category} • {merchant.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Active Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.active_deals}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Total Grabs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total_grabs}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                Pending Validations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.pending_validations}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="grabs">Recent Grabs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest grabs from customers</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentGrabs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No recent activity
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {recentGrabs.map((grab) => (
                        <div key={grab.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                          <div>
                            <p className="font-medium text-sm">{grab.deal_title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(grab.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(grab.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common merchant tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Tag className="h-4 w-4 mr-2" />
                    Create New Deal
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <QrCode className="h-4 w-4 mr-2" />
                    Validate Customer
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Merchant Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deals">
            <Card>
              <CardHeader>
                <CardTitle>Deal Management</CardTitle>
                <CardDescription>Create and manage your deals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Deal management coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grabs">
            <Card>
              <CardHeader>
                <CardTitle>Customer Grabs</CardTitle>
                <CardDescription>Track all customer interactions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentGrabs.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No customer grabs yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentGrabs.map((grab) => (
                      <div key={grab.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{grab.deal_title}</p>
                          <p className="text-sm text-muted-foreground">{grab.user_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(grab.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(grab.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {grab.id.slice(-8)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Performance insights and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}