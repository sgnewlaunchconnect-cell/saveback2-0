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
  const [applyCredits, setApplyCredits] = useState(true);
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
  const localCredits = 8.50;
  const networkCredits = 7.25;
  const totalCredits = localCredits + networkCredits;

  const calculatePayment = () => {
    const bill = parseFloat(billAmount) || 0;
    let creditsUsed = 0;
    
    if (applyCredits && bill > 0) {
      // Use local credits first, then network credits
      creditsUsed = Math.min(totalCredits, bill);
    }
    
    const finalAmount = Math.max(0, bill - creditsUsed);
    
    return {
      billAmount: bill,
      creditsUsed,
      finalAmount
    };
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
    setApplyCredits(true);
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
              
              {/* Total Savings Display */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${(totalSavings + newCreditsEarned).toFixed(2)}
                  </div>
                  <div className="text-sm font-medium text-green-700 mb-3">
                    Total Savings
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/50 p-2 rounded">
                      <div className="text-lg font-semibold text-green-600">
                        ${totalSavings.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-700">
                        Credits Used
                      </div>
                    </div>
                    <div className="bg-white/50 p-2 rounded">
                      <div className="text-lg font-semibold text-blue-600">
                        +${newCreditsEarned.toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-700">
                        Credits Earned
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Your Credits</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  ${totalCredits.toFixed(2)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/50 p-2 rounded">
                  <div className="text-xs text-purple-600">Local</div>
                  <div className="font-semibold text-purple-800">${localCredits.toFixed(2)}</div>
                </div>
                <div className="bg-white/50 p-2 rounded">
                  <div className="text-xs text-purple-600">Network</div>
                  <div className="font-semibold text-purple-800">${networkCredits.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <Label htmlFor="applyCredits" className="text-sm font-medium text-purple-800">
                  Apply Credits?
                </Label>
                <Switch
                  id="applyCredits"
                  checked={applyCredits}
                  onCheckedChange={setApplyCredits}
                />
              </div>
              
              <p className="text-xs text-purple-700">
                {applyCredits 
                  ? "✨ Auto-uses local credits first, then network credits"
                  : "💎 Save credits for bigger purchases to maximize value!"
                }
              </p>
            </CardContent>
          </Card>

          {billAmount && parseFloat(billAmount) > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Bill:</span>
                  <span>${calculation.billAmount.toFixed(2)}</span>
                </div>
                {calculation.creditsUsed > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Credits Applied:</span>
                    <span>-${calculation.creditsUsed.toFixed(2)}</span>
                  </div>
                )}
                {calculation.creditsUsed > 0 && (
                  <div className="flex justify-between text-purple-600 text-sm">
                    <span>Credits Remaining:</span>
                    <span>${(totalCredits - calculation.creditsUsed).toFixed(2)}</span>
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