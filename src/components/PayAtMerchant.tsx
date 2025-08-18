import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PayAtMerchantProps {
  onPaymentComplete?: (paymentData: {
    billAmount: number;
    creditsUsed: number;
    finalAmount: number;
    paymentCode: string;
  }) => void;
}

export default function PayAtMerchant({ onPaymentComplete }: PayAtMerchantProps) {
  const [billAmount, setBillAmount] = useState<string>("");
  const [creditsToUse, setCreditsToUse] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    billAmount: number;
    creditsUsed: number;
    finalAmount: number;
    paymentCode: string;
  } | null>(null);
  const { toast } = useToast();

  // Demo credit amounts - in real app, fetch from API
  const availableCredits = 15.75;

  const calculatePayment = () => {
    const bill = parseFloat(billAmount) || 0;
    const finalAmount = Math.max(0, bill - creditsToUse);
    
    return {
      billAmount: bill,
      creditsUsed: creditsToUse,
      finalAmount
    };
  };

  const handleCreditChange = (amount: number) => {
    const bill = parseFloat(billAmount) || 0;
    const maxUsable = Math.min(availableCredits, bill);
    setCreditsToUse(Math.min(amount, maxUsable));
  };

  const handlePayment = async () => {
    const bill = parseFloat(billAmount);
    if (!bill || bill <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bill amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const calculation = calculatePayment();
      
      // Call mock payment service
      const { data, error } = await supabase.functions.invoke('mock-payment', {
        body: {
          billAmount: calculation.billAmount,
          creditsUsed: calculation.creditsUsed,
          finalAmount: calculation.finalAmount
        }
      });

      if (error) throw error;

      if (data.success) {
        const finalPaymentData = {
          billAmount: data.billAmount,
          creditsUsed: data.creditsUsed,
          finalAmount: data.finalAmount,
          paymentCode: data.paymentCode
        };

        setPaymentData(finalPaymentData);
        setPaymentComplete(true);
        
        toast({
          title: "Payment Successful! 🎉",
          description: `Paid $${data.finalAmount.toFixed(2)} using $${data.creditsUsed.toFixed(2)} credits`
        });
        
        onPaymentComplete?.(finalPaymentData);
      } else {
        throw new Error(data.error || 'Payment failed');
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetPayment = () => {
    setPaymentComplete(false);
    setPaymentData(null);
    setBillAmount("");
    setCreditsToUse(0);
  };

  if (paymentComplete && paymentData) {
    // Calculate achievements and rewards
    const totalSavings = paymentData.creditsUsed;
    const newCreditsEarned = Math.round(paymentData.finalAmount * 0.1 * 100) / 100; // 10% cashback
    const discountAchieved = paymentData.creditsUsed > 0 ? ((paymentData.creditsUsed / paymentData.billAmount) * 100).toFixed(0) : "0";

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <div className="text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              
              <div>
                <h1 className="text-4xl font-bold text-green-600">
                  ✅ Paid ${paymentData.finalAmount.toFixed(2)}
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Payment Successful!
                </p>
              </div>
              
              {/* Achievement Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${totalSavings.toFixed(2)}
                    </div>
                    <div className="text-xs text-green-700">
                      Credits Used
                    </div>
                    <div className="text-xs text-green-600">
                      {discountAchieved}% Discount!
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      +${newCreditsEarned.toFixed(2)}
                    </div>
                    <div className="text-xs text-blue-700">
                      Credits Earned
                    </div>
                    <div className="text-xs text-blue-600">
                      🎉 Cashback!
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Motivational Message */}
              {(totalSavings > 0 || newCreditsEarned > 0) && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-700">
                    🌟 Amazing! You're building wealth with every purchase!
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Keep using JustDeals to maximize your savings
                  </p>
                </div>
              )}
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Total Bill: ${paymentData.billAmount.toFixed(2)}</p>
                <p>You Paid: ${paymentData.finalAmount.toFixed(2)}</p>
              </div>
              
              <Separator />
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Payment Code</p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {paymentData.paymentCode}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Show this to merchant if requested
                </p>
              </div>
              
              <Button onClick={resetPayment} variant="outline" className="w-full">
                Make Another Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculation = calculatePayment();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Pay at Merchant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Credit Balance Display */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Your Credits</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  ${availableCredits.toFixed(2)}
                </div>
              </div>
              <p className="text-xs text-purple-700 mb-3">
                💰 Save credits for bigger purchases! Every dollar saved grows your wealth.
              </p>
              
              {billAmount && parseFloat(billAmount) > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="creditAmount" className="text-sm font-medium">
                      Use Credits (Optional)
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Max: ${Math.min(availableCredits, parseFloat(billAmount)).toFixed(2)}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="creditAmount"
                      type="number"
                      placeholder="0.00"
                      value={creditsToUse || ""}
                      onChange={(e) => handleCreditChange(parseFloat(e.target.value) || 0)}
                      className="pl-8"
                      step="0.01"
                      min="0"
                      max={Math.min(availableCredits, parseFloat(billAmount))}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreditsToUse(0)}
                      className="text-xs"
                    >
                      Save All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const bill = parseFloat(billAmount) || 0;
                        const halfBill = bill / 2;
                        handleCreditChange(Math.min(halfBill, availableCredits));
                      }}
                      className="text-xs"
                    >
                      Use Half
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const bill = parseFloat(billAmount) || 0;
                        handleCreditChange(Math.min(availableCredits, bill));
                      }}
                      className="text-xs"
                    >
                      Use Max
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {billAmount && parseFloat(billAmount) > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Bill:</span>
                  <span>${calculation.billAmount.toFixed(2)}</span>
                </div>
                {creditsToUse > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Credits Applied:</span>
                    <span>-${creditsToUse.toFixed(2)}</span>
                  </div>
                )}
                {creditsToUse > 0 && (
                  <div className="flex justify-between text-purple-600 text-sm">
                    <span>Credits Remaining:</span>
                    <span>${(availableCredits - creditsToUse).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Final Payable:</span>
                  <span>${calculation.finalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={handlePayment}
            disabled={!billAmount || parseFloat(billAmount) <= 0 || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? "Processing..." : "Confirm & Pay"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}