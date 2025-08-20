import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowLeft } from "lucide-react";
import ProofOfPaymentQR from "@/components/ProofOfPaymentQR";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionId = searchParams.get("session_id");
  
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { sessionId }
      });

      if (error) throw error;

      setPaymentData(data);
      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed and credits awarded.",
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Verification Error",
        description: "There was an issue verifying your payment. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !paymentData) {
    // Show dummy data for demo
    const dummyData = {
      paymentIntentId: 'pi_3RyDGaLSqIZh0Qqt1oLmwsYN',
      merchantName: 'Coffee Corner Café',
      amount: 86696, // ₹866.96 in paisa
      timestamp: new Date().toLocaleString()
    };

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <ProofOfPaymentQR
            paymentIntentId={dummyData.paymentIntentId}
            merchantName={dummyData.merchantName}
            amount={dummyData.amount}
            timestamp={dummyData.timestamp}
            onContinue={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-green-600 dark:text-green-400">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Payment Code: {paymentData.paymentCode}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Your payment has been processed automatically
              </p>
            </div>

            {paymentData.validationResult && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <h3 className="font-medium">Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Credits Earned:</span>
                    <span className="font-medium text-green-600">
                      ₹{paymentData.validationResult.localCredits?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  {paymentData.validationResult.networkCredits > 0 && (
                    <div className="flex justify-between">
                      <span>Network Credits:</span>
                      <span className="font-medium text-blue-600">
                        ₹{paymentData.validationResult.networkCredits.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-medium">What's Next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your credits have been automatically added</li>
                <li>• No merchant validation needed</li>
                <li>• You can start earning more rewards immediately</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/deals')} 
                className="w-full"
              >
                Continue Shopping
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}