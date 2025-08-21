import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, QrCode, CreditCard, Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/utils/userIdManager";
import { useToast } from "@/hooks/use-toast";

export default function Demo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const tryLatestGrab = async () => {
    setLoading(true);
    try {
      const anonymousUserId = getUserId();
      
      const { data, error } = await supabase.functions.invoke('getGrabs', {
        body: { 
          anonymousUserId,
          includeHistory: false 
        }
      });

      if (error) throw error;

      if (data.grabs && data.grabs.length > 0) {
        const latestGrab = data.grabs[0];
        navigate(`/pay-at-merchant?grabId=${latestGrab.id}&demo=1`);
      } else {
        toast({
          title: "No Active Grabs",
          description: "You don't have any active grabs. Try creating a demo grab instead.",
          variant: "destructive" as const
        });
      }
    } catch (error) {
      console.error('Error fetching grabs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your grabs",
        variant: "destructive" as const
      });
    } finally {
      setLoading(false);
    }
  };

  const createDemoGrab = async () => {
    setLoading(true);
    try {
      // First, fetch an active deal
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('id, title, description, is_active, end_at')
        .eq('is_active', true)
        .gte('end_at', new Date().toISOString())
        .limit(1);

      if (dealsError) throw dealsError;

      if (!deals || deals.length === 0) {
        toast({
          title: "No Active Deals",
          description: "There are no active deals available to create a demo grab.",
          variant: "destructive" as const
        });
        return;
      }

      const deal = deals[0];
      const anonymousUserId = getUserId();

      // Create a grab using the deal
      const { data, error } = await supabase.functions.invoke('createGrab', {
        body: {
          dealId: deal.id,
          anonymousUserId
        }
      });

      if (error) throw error;

      if (data.success && data.grab) {
        navigate(`/pay-at-merchant?grabId=${data.grab.id}&demo=1`);
      } else {
        throw new Error('Failed to create grab');
      }
    } catch (error) {
      console.error('Error creating demo grab:', error);
      toast({
        title: "Error",
        description: "Failed to create demo grab",
        variant: "destructive" as const
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
          >
            ← Back to Deals
          </Button>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Demo Mode</h1>
            <p className="text-muted-foreground mt-2">
              Try the app without needing a cashier device. Perfect for testing the payment flow.
            </p>
          </div>

          {/* Payment Code Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Payment Code Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Experience the cash payment flow with simulated merchant actions.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={tryLatestGrab}
                  disabled={loading}
                  className="w-full"
                  variant="default"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Gift className="h-4 w-4 mr-2" />
                  )}
                  Use My Latest Grab
                </Button>
                
                <Button 
                  onClick={createDemoGrab}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Create Demo Grab
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <h4 className="font-medium text-sm mb-2">How it works:</h4>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. Generate a payment code with QR</li>
                  <li>2. Simulate merchant scanning the code</li>
                  <li>3. Simulate cash collection confirmation</li>
                  <li>4. See the complete payment flow</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Future Features */}
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="py-4">
              <div className="text-center text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">More demo features coming soon</p>
                <p className="text-xs">Verify Payment, Merchant Portal, and more</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}