import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/utils/userIdManager";
import QuickPaymentFlow from "@/components/QuickPaymentFlow";
import { Button } from "@/components/ui/button";

export default function PayAtMerchant() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const grabId = searchParams.get("grabId");
  
  const [grabData, setGrabData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (grabId) {
      fetchGrabData();
    } else {
      setLoading(false);
    }
  }, [grabId]);

  const fetchGrabData = async () => {
    setLoading(true);
    try {
      const anonymousUserId = getUserId();

      const { data, error } = await supabase.functions.invoke('getGrab', {
        body: { grabId, anonymousUserId }
      });

      if (error) throw error;

      setGrabData(data.data);
    } catch (error) {
      console.error('Error fetching grab data:', error);
      toast({
        title: "Error",
        description: "Failed to load deal information",
        variant: "destructive"
      });
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async (paymentResult: any) => {
    // Payment code generated - merchant validation will handle the rest
    console.log('Payment code generated for validation:', paymentResult.paymentCode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading deal information...</p>
        </div>
      </div>
    );
  }

  if (!grabData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/deals')}
            >
              ← Back to Deals
            </Button>
          </div>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No deal information found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/deals')}
          >
            ← Back to Deals
          </Button>
        </div>
        
        <QuickPaymentFlow
          grabData={grabData}
          localCredits={850}    // Demo credits
          networkCredits={725}
          onComplete={handlePaymentComplete}
        />
      </div>
    </div>
  );
}