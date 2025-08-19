import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, AlertCircle } from "lucide-react";

export default function CustomerValidation() {
  const [billAmount, setBillAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  
  // Demo merchant ID (Hawker Corner)
  const DEMO_MERCHANT_ID = "e8d2f33c-cddd-4943-8963-f26fb0022176";

  const handlePayment = async () => {
    if (!billAmount || parseFloat(billAmount) <= 0) {
      toast.error("Please enter a valid bill amount");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Create pending transaction
      const { data, error } = await supabase.functions.invoke('createPendingTransaction', {
        body: {
          merchantId: DEMO_MERCHANT_ID,
          originalAmount: Math.round(parseFloat(billAmount) * 100), // Convert to cents
          anonymousUserId: true, // Use demo user
          dealId: null // Can be updated to support specific deals
        }
      });

      if (error) {
        console.error("Transaction error:", error);
        toast.error("Failed to create transaction");
        return;
      }

      if (data.success) {
        setPaymentResult({
          success: true,
          paymentCode: data.data.paymentCode,
          billAmount: parseFloat(billAmount),
          creditEarned: Math.round((parseFloat(billAmount) * data.data.cashbackPct) / 100),
          transactionId: data.data.transactionId,
          merchantName: data.data.merchantName,
          expiresAt: data.data.expiresAt
        });
        toast.success("Payment code generated successfully!");
      } else {
        toast.error("Failed to generate payment code");
      }
      
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPayment = () => {
    setPaymentResult(null);
    setBillAmount("");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Customer Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {paymentResult ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-800">Payment Code Generated!</h3>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="text-3xl font-bold text-blue-600">
                    {paymentResult.paymentCode}
                  </div>
                  <p className="text-sm text-gray-600">6-digit payment code</p>
                  <p className="text-xs text-gray-500">Show this code to the hawker for verification</p>
                  <p className="text-xs text-gray-400">Expires in 5 minutes</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Merchant:</span>
                    <span className="font-semibold">{paymentResult.merchantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bill Amount:</span>
                    <span className="font-semibold">${paymentResult.billAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Credits to Earn:</span>
                    <span className="font-semibold">+${paymentResult.creditEarned}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Transaction ID:</span>
                    <span>{paymentResult.transactionId}</span>
                  </div>
                </div>

                <Button 
                  onClick={resetPayment}
                  variant="outline"
                  className="w-full"
                >
                  Generate Another Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="billAmount">Bill Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="billAmount"
                      type="number"
                      placeholder="0.00"
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      className="pl-8"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={!billAmount || parseFloat(billAmount) <= 0 || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Code...
                    </>
                  ) : (
                    "Generate Payment Code"
                  )}
                </Button>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-medium text-sm mb-2">How it works:</h3>
                  <ol className="text-xs text-muted-foreground space-y-1">
                    <li>1. Enter your bill amount</li>
                    <li>2. Generate a payment code</li>
                    <li>3. Show the code to the hawker</li>
                    <li>4. Hawker validates code and you earn credits!</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}