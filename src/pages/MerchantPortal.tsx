import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Store, BarChart3, Settings, ShieldCheck, Package, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DealManagement from "@/components/DealManagement";
import MerchantValidation from "@/components/MerchantValidation";
import MerchantAnalytics from "@/components/MerchantAnalytics";
import MerchantSettings from "@/components/MerchantSettings";
import ProductManagement from "@/components/ProductManagement";
import ReelsManager from "@/components/ReelsManager";
import GrabManagement from "@/components/GrabManagement";

interface MerchantInfo {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  default_cashback_pct: number;
  default_reward_mode: string;
  address?: string;
  phone?: string;
}

export default function MerchantPortal() {
  const { merchantId } = useParams();
  const { toast } = useToast();
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("deals");

  useEffect(() => {
    loadMerchantData();
  }, [merchantId]);

  const loadMerchantData = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (error) throw error;
      setMerchantInfo(data);
    } catch (error) {
      console.error('Error loading merchant:', error);
      toast({
        title: "Error",
        description: "Failed to load merchant information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!merchantInfo) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Merchant not found
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{merchantInfo.name}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={merchantInfo.is_active ? "default" : "secondary"}>
                {merchantInfo.is_active ? "Active" : "Inactive"}
              </Badge>
              <span className="text-muted-foreground">
                {merchantInfo.category}
              </span>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="deals" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Deals
            </TabsTrigger>
            <TabsTrigger value="grabs" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Grabs
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Products
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage your product catalog and inventory
                  </p>
                </CardHeader>
                <CardContent>
                  <ProductManagement merchantId={merchantId!} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Video Reels
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Showcase your business with video content
                  </p>
                </CardHeader>
                <CardContent>
                  <ReelsManager merchantId={merchantId!} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="deals" className="space-y-4">
            <DealManagement merchantId={merchantId!} />
          </TabsContent>

          <TabsContent value="grabs" className="space-y-4">
            <GrabManagement merchantId={merchantId!} />
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <MerchantValidation merchantId={merchantId!} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <MerchantAnalytics merchantId={merchantId!} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <MerchantSettings 
              merchantInfo={merchantInfo} 
              onUpdate={setMerchantInfo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}