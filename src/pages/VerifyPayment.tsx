import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentDetails {
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  merchantName?: string;
  description?: string;
}

export default function VerifyPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    verifyPayment();
  }, [paymentId]);

  const verifyPayment = async () => {
    try {
      // If no paymentId, show dummy data for demo
      if (!paymentId || paymentId === 'demo') {
        setPaymentDetails({
          paymentIntentId: 'pi_3RyDGaLSqIZh0Qqt1oLmwsYN',
          amount: 86696, // ₹866.96 in paisa
          currency: 'inr',
          status: 'succeeded',
          created: Date.now() / 1000 - 3600, // 1 hour ago
          merchantName: 'Coffee Corner',
          description: 'Payment for grab pass deal'
        });
        setLoading(false);
        return;
      }

      const { data, error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: { paymentIntentId: paymentId }
      });

      if (verifyError) {
        throw verifyError;
      }

      if (data) {
        setPaymentDetails({
          paymentIntentId: paymentId!,
          amount: data.amount,
          currency: data.currency || 'inr',
          status: data.status,
          created: data.created || Date.now() / 1000,
          merchantName: data.merchantName,
          description: data.description
        });
      }
    } catch (err: any) {
      console.error('Payment verification failed:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'processing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'requires_action': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Verifying payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto border-destructive/20">
          <CardContent className="pt-6 text-center">
            <X className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">Verification Failed</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/')} variant="outline">
                Return Home
              </Button>
              <Button 
                onClick={() => {
                  setError(null);
                  verifyPayment();
                }} 
                variant="default"
                size="sm"
              >
                Try Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            <CreditCard className="w-5 h-5" />
            Payment Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Header */}
          <div className="text-center">
            {paymentDetails?.status === 'succeeded' ? (
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            ) : (
              <X className="w-16 h-16 text-red-600 mx-auto mb-4" />
            )}
            
            <Badge className={getStatusColor(paymentDetails?.status || 'unknown')}>
              {paymentDetails?.status === 'succeeded' ? 'Payment Verified' : 'Payment Status: ' + paymentDetails?.status}
            </Badge>
          </div>

          {/* Payment Details */}
          {paymentDetails && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono text-xs">{paymentDetails.paymentIntentId}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  ₹{(paymentDetails.amount / 100).toFixed(2)}
                </span>
              </div>
              
              {paymentDetails.merchantName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Merchant:</span>
                  <span>{paymentDetails.merchantName}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{formatDate(paymentDetails.created)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant={paymentDetails?.status === 'succeeded' ? 'default' : 'outline'}
            >
              Return to App
            </Button>
            
            {paymentDetails?.status === 'succeeded' && (
              <p className="text-xs text-center text-muted-foreground">
                This payment has been verified and processed successfully.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}