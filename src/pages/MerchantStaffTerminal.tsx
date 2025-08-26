import { useParams, Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMerchantAccess } from "@/hooks/useMerchantAccess";
import MerchantValidation from "@/components/MerchantValidation";
import { Loader2, Store, User, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function MerchantStaffTerminal() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const { access, isLoading, error, isStaff } = useMerchantAccess(merchantId);
  const [merchantInfo, setMerchantInfo] = useState<{ name: string } | null>(null);
  const [staffName, setStaffName] = useState<string>("");

  useEffect(() => {
    if (merchantId) {
      loadMerchantInfo();
    }
    loadStaffName();
  }, [merchantId]);

  const loadMerchantInfo = async () => {
    const { data } = await supabase
      .from('merchants')
      .select('name')
      .eq('id', merchantId!)
      .single();
    
    if (data) {
      setMerchantInfo(data);
    }
  };

  const loadStaffName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('user_id', user.id)
        .single();
      
      setStaffName(userData?.display_name || userData?.email?.split('@')[0] || 'Staff Member');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !isStaff) {
    return <Navigate to="/auth" replace />;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'manager': return 'secondary';
      case 'staff': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Store className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">{merchantInfo?.name || 'Merchant Terminal'}</h1>
                <p className="text-sm text-muted-foreground">Staff Payment Terminal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{staffName}</span>
              </div>
              <Badge variant={getRoleBadgeVariant(access?.role || 'staff')}>
                <Shield className="h-3 w-3 mr-1" />
                {access?.role?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Payment Processing Terminal</span>
              </CardTitle>
              <CardDescription>
                Validate customer payments, collect cash, and manage transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span>Validate Payments</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span>Collect Cash</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  <span>View Transactions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          {/* Merchant Validation Component */}
          <MerchantValidation 
            merchantId={merchantId!} 
            isStaffTerminal={true}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-card mt-8">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Staff Terminal Mode</span>
            <span>Role: {access?.role?.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}