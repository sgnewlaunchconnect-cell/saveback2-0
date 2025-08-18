import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, CreditCard, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [useCredits, setUseCredits] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    billAmount: number;
    creditsUsed: number;
    finalAmount: number;
    paymentCode: string;
  } | null>(null);
  const { toast } = useToast();

  // Demo credit amounts
  const availableCredits = 2.0;

  const calculatePayment = () => {
    const bill = parseFloat(billAmount) || 0;
    const creditsToUse = useCredits ? Math.min(availableCredits, bill) : 0;
    const finalAmount = Math.max(0, bill - creditsToUse);
    
    return {
      billAmount: bill,
      creditsUsed: creditsToUse,
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
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const calculation = calculatePayment();
      const paymentCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const finalPaymentData = {
        ...calculation,
        paymentCode
      };
      
      setPaymentData(finalPaymentData);
      setPaymentComplete(true);
      
      toast({
        title: "Payment Successful! 🎉",
        description: `Paid $${finalPaymentData.finalAmount.toFixed(2)}`
      });
      
      onPaymentComplete?.(finalPaymentData);
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Please try again",
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
  };

  if (paymentComplete && paymentData) {
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
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Credits Used: ${paymentData.creditsUsed.toFixed(2)}</p>
                <p>Total Bill: ${paymentData.billAmount.toFixed(2)}</p>
              </div>
              
              <Separator />
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Payment Code</p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {paymentData.paymentCode}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <Label htmlFor="useCredits">Use Credits</Label>
            </div>
            <Switch
              id="useCredits"
              checked={useCredits}
              onCheckedChange={setUseCredits}
            />
          </div>

          {billAmount && parseFloat(billAmount) > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Bill:</span>
                  <span>${calculation.billAmount.toFixed(2)}</span>
                </div>
                {useCredits && (
                  <div className="flex justify-between text-green-600">
                    <span>Credits Available:</span>
                    <span>-${calculation.creditsUsed.toFixed(2)}</span>
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