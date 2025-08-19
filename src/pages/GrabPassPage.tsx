import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PaymentFlow from "@/components/PaymentFlow";
import PaymentSuccess from "@/components/PaymentSuccess";
import { getUserId } from "@/utils/userIdManager";

interface GrabData {
  id: string;
  pin: string;
  status: string;
  expires_at: string;
  created_at: string;
  deals: {
    title: string;
    description: string;
    discount_pct: number;
    cashback_pct: number;
    reward_mode: string;
    merchants: {
      name: string;
      address: string;
    };
  };
}

export default function GrabPassPage() {
  const { grabId } = useParams<{ grabId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [grabData, setGrabData] = useState<GrabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (grabId) {
      fetchGrabData();
    }
  }, [grabId]);

  useEffect(() => {
    // Auto-open payment if useNow param is present, but only for cashback deals
    if (searchParams.get('useNow') === 'true' && grabData && !isDiscountOnlyDeal() && grabData.status === 'ACTIVE') {
      setShowPayment(true);
    }
  }, [searchParams, grabData]);

  useEffect(() => {
    if (grabData) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(grabData.expires_at).getTime();
        const remaining = Math.max(0, expiry - now);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [grabData]);

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
        description: "Failed to load grab pass",
        variant: "destructive"
      });
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const handleUseNow = () => {
    // For discount-only deals, just show instructions - no navigation needed
    if (isDiscountOnlyDeal()) {
      return; // Instructions are already visible on the page
    }
    setShowPayment(true);
  };

  const isDiscountOnlyDeal = () => {
    return grabData?.deals?.discount_pct > 0 && grabData?.deals?.cashback_pct === 0;
  };

  const handlePaymentComplete = async (paymentResult: any) => {
    try {
      const anonymousUserId = getUserId();
      
      // Call useGrab function to mark as used
      const { data, error } = await supabase.functions.invoke('useGrab', {
        body: { 
          grabId, 
          anonymousUserId,
          paymentCode: paymentResult.paymentCode 
        }
      });

      if (error) throw error;

      // Store payment data for success screen
      setPaymentData({
        paymentCode: paymentResult.paymentCode,
        totalSavings: paymentResult.totalSavings,
        originalAmount: paymentResult.originalAmount,
        finalAmount: paymentResult.finalAmount,
        creditsUsed: paymentResult.creditsUsed
      });
      
      setShowPayment(false);
      setShowSuccess(true);
      
      // Update local state
      if (grabData) {
        setGrabData({
          ...grabData,
          status: 'USED'
        });
      }
    } catch (error: any) {
      console.error('Error marking grab as used:', error);
      
      // Handle specific error codes
      if (error.message?.includes('409') || error.message?.includes('ALREADY_USED')) {
        // Grab already used, refetch data and show updated status
        await fetchGrabData();
        toast({
          title: "Already Used",
          description: "This grab pass has already been used",
          variant: "destructive"
        });
      } else if (error.message?.includes('410') || error.message?.includes('EXPIRED')) {
        // Grab expired, refetch data and show updated status
        await fetchGrabData();
        toast({
          title: "Expired",
          description: "This grab pass has expired",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Payment processed but failed to update grab status",
          variant: "destructive"
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading grab pass...</p>
        </div>
      </div>
    );
  }

  if (!grabData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Grab Pass Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This grab pass doesn't exist or has expired.
            </p>
            <Button onClick={() => navigate('/deals')} className="w-full">
              Browse Deals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = timeLeft === 0;
  const isUsed = grabData.status === 'USED';
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  if (showSuccess && paymentData) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <PaymentSuccess
            paymentCode={paymentData.paymentCode}
            totalSavings={paymentData.totalSavings}
            originalAmount={paymentData.originalAmount}
            finalAmount={paymentData.finalAmount}
            creditsUsed={paymentData.creditsUsed}
            onContinue={() => {
              setShowSuccess(false);
              navigate('/redeem');
            }}
          />
        </div>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => setShowPayment(false)}
              className="mb-4"
            >
              ← Back to Grab Pass
            </Button>
          </div>
          
          <PaymentFlow
            billAmount={100}
            localCredits={850}    // Demo credits
            networkCredits={725}
            allowBillInput={true}  // Allow user to enter purchase amount
            directDiscount={grabData?.deals?.discount_pct || 0}
            onPaymentComplete={handlePaymentComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Grab Pass
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Indicator */}
          <div className="text-center">
            {isUsed ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <span className="font-medium">Used</span>
              </div>
            ) : isExpired ? (
              <div className="flex items-center justify-center gap-2 text-red-600">
                <XCircle className="w-6 h-6" />
                <span className="font-medium">Expired</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="w-6 h-6" />
                <span className="font-medium">Active</span>
              </div>
            )}
          </div>

          {/* Deal Info */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-800 mb-2">{grabData.deals.title}</h3>
              <p className="text-sm text-blue-700 mb-3">{grabData.deals.description}</p>
              
              <div className="flex items-center gap-2 mb-2">
                {grabData.deals.discount_pct > 0 && (
                  <Badge variant="secondary">
                    {grabData.deals.discount_pct}% OFF
                  </Badge>
                )}
                {grabData.deals.cashback_pct > 0 && (
                  <Badge variant="outline">
                    {grabData.deals.cashback_pct}% Cashback
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-blue-600">
                <p className="font-medium">{grabData.deals.merchants.name}</p>
                <p>{grabData.deals.merchants.address}</p>
              </div>
            </CardContent>
          </Card>

          {/* PIN Display */}
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Backup Code</p>
              <div className="text-4xl font-mono font-bold tracking-wider mb-2 text-primary">
                {grabData.pin}
              </div>
              <p className="text-xs text-muted-foreground">
                Use this only if the merchant can't scan your code
              </p>
            </CardContent>
          </Card>

          {/* Timer */}
          {!isUsed && !isExpired && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Expires in</span>
                </div>
                <div className="text-center font-mono text-lg">
                  {hours.toString().padStart(2, '0')}:
                  {minutes.toString().padStart(2, '0')}:
                  {seconds.toString().padStart(2, '0')}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isUsed && !isExpired && (
              <Button onClick={handleUseNow} variant="cta" className="w-full" size="sm">
                {isDiscountOnlyDeal() ? "View Instructions" : "Use Now & Pay"}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/deals')} 
              className="w-full"
            >
              Browse More Deals
            </Button>
            
            {isExpired && !isUsed && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/deals`)} 
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Grab Again
              </Button>
            )}
          </div>

          {/* Usage Instructions */}
          {!isUsed && !isExpired && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">How to Use:</h4>
              <ol className="text-xs text-muted-foreground space-y-1">
                {isDiscountOnlyDeal() ? (
                  <>
                    <li>1. Visit the merchant location</li>
                    <li>2. Show your PIN: <strong>{grabData.pin}</strong></li>
                    <li>3. Merchant will enter PIN to validate your discount</li>
                    <li>4. Get {grabData?.deals?.discount_pct}% off your purchase!</li>
                  </>
                ) : (
                  <>
                    <li>1. Visit the merchant location</li>
                    <li>2. Show your PIN: <strong>{grabData.pin}</strong></li>
                    <li>3. Use "Pay Now" to calculate final amount with credits</li>
                    <li>4. Pay the final amount and earn cashback!</li>
                  </>
                )}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
