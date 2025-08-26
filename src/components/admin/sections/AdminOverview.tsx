import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Store, CreditCard, DollarSign, Flag, TrendingUp, UserPlus } from "lucide-react";

interface OverviewStats {
  totalUsers: number;
  totalMerchants: number;
  totalTransactions: number;
  pendingSettlements: number;
  pendingReviewFlags: number;
  totalRevenue: number;
}

export function AdminOverview() {
  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: 0,
    totalMerchants: 0,
    totalTransactions: 0,
    pendingSettlements: 0,
    pendingReviewFlags: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [seedingAccounts, setSeedingAccounts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      const [
        usersResult,
        merchantsResult,
        transactionsResult,
        settlementsResult,
        reviewFlagsResult,
        revenueResult,
      ] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("merchants").select("id", { count: "exact", head: true }),
        supabase.from("pending_transactions").select("id", { count: "exact", head: true }),
        supabase.from("merchant_settlements").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("review_flags").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("pending_transactions").select("final_amount").eq("status", "captured"),
      ]);

      const totalRevenue = revenueResult.data?.reduce((sum, t) => sum + Number(t.final_amount), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalMerchants: merchantsResult.count || 0,
        totalTransactions: transactionsResult.count || 0,
        pendingSettlements: settlementsResult.count || 0,
        pendingReviewFlags: reviewFlagsResult.count || 0,
        totalRevenue,
      });
    } catch (error) {
      console.error("Error fetching overview stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTestAccounts = async () => {
    setSeedingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke('seedTestAccounts');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Test accounts created successfully!",
          description: "Check console for credentials",
        });
        
        // Display credentials in dev console for easy access
        if (import.meta.env.DEV) {
          console.debug("=== TEST ACCOUNT CREDENTIALS ===");
          data.accounts.forEach((account: any) => {
            console.debug(`${account.role.toUpperCase()}: ${account.email} / ${account.password}`);
          });
          console.debug("================================");
        }
        
        // Refresh stats
        fetchOverviewStats();
      }
    } catch (error) {
      console.error('Error creating test accounts:', error);
      toast({
        title: "Error creating test accounts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSeedingAccounts(false);
    }
  };

  const statsCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Total Merchants",
      value: stats.totalMerchants,
      icon: Store,
      color: "text-green-600",
    },
    {
      title: "Total Transactions",
      value: stats.totalTransactions,
      icon: CreditCard,
      color: "text-purple-600",
    },
    {
      title: "Total Revenue",
      value: `$${(stats.totalRevenue / 100).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-emerald-600",
    },
    {
      title: "Pending Settlements",
      value: stats.pendingSettlements,
      icon: DollarSign,
      color: "text-orange-600",
    },
    {
      title: "Pending Review Flags",
      value: stats.pendingReviewFlags,
      icon: Flag,
      color: "text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button 
          onClick={createTestAccounts}
          disabled={seedingAccounts}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {seedingAccounts ? "Creating..." : "Create Test Accounts"}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}