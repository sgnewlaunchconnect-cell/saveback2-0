import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import PaymentFlow from "@/components/PaymentFlow";

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
  
  const [grabData, setGrabData] = useState<GrabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (grabId) {
      fetchGrabData();
    }
  }, [grabId]);

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
      // Simplified query for demo - fetch grab and deal separately
      const { data: grabData, error: grabError } = await supabase
        .from('grabs')
        .select('id, pin, status, expires_at, created_at, deal_id')
        .eq('id', grabId)
        .single();

      if (grabError) throw grabError;

      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('title, description, discount_pct, cashback_pct, reward_mode, merchants(name, address)')
        .eq('id', grabData.deal_id)
        .single();

      if (dealError) throw dealError;

      setGrabData({
        ...grabData,
        deals: dealData
      });
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
    setShowPayment(true);
  };

  const handlePaymentComplete = () => {
    toast({
      title: "Payment Complete! 🎉",
      description: "Your grab pass has been used successfully"
    });
    
    // Update grab status to USED
    supabase
      .from('grabs')
      .update({ 
        status: 'USED',
        used_at: new Date().toISOString()
      })
      .eq('id', grabId);
      
    setShowPayment(false);
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
            localCredits={850}    // Demo credits
            networkCredits={725}
            autoApplyCredits={true}
            allowAmountInput={true}  // Allow user to enter purchase amount
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
              <p className="text-sm text-muted-foreground mb-2">Your PIN</p>
              <div className="text-4xl font-mono font-bold tracking-wider mb-2">
                {grabData.pin}
              </div>
              <p className="text-xs text-muted-foreground">
                Show this to merchant or use in payment
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
          <div className="space-y-3">
            {!isUsed && !isExpired && (
              <Button onClick={handleUseNow} className="w-full" size="lg">
                Use Now & Pay
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
                onClick={() => navigate(`/deals/${grabData.deals}`)} 
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
                <li>1. Visit the merchant location</li>
                <li>2. Show your PIN: <strong>{grabData.pin}</strong></li>
                <li>3. Use "Pay Now" to calculate final amount with credits</li>
                <li>4. Pay the final amount and earn cashback!</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}