import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Gift, Zap } from 'lucide-react';

interface PaymentFlowProps {
  billAmount: number;
  localCredits: number;
  networkCredits: number;
  allowBillInput?: boolean;
  directDiscount?: number; // Direct discount percentage (0-100)
  onPaymentComplete: (result: PaymentResult) => void;
}

interface PaymentResult {
  paymentCode: string;
  totalSavings: number;
  originalAmount: number;
  finalAmount: number;
  creditsUsed: number;
  directDiscountAmount?: number;
}

export default function PaymentFlow({
  billAmount: originalBillAmount,
  localCredits,
  networkCredits,
  allowBillInput = false,
  directDiscount = 0,
  onPaymentComplete
}: PaymentFlowProps) {
  const { toast } = useToast();
  const [useCredits, setUseCredits] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputAmount, setInputAmount] = useState('');

  const currentAmount = allowBillInput 
    ? (parseFloat(inputAmount) || 0)
    : originalBillAmount;

  const calculatePayment = () => {
    let amount = currentAmount;
    
    // Apply direct discount first (if any)
    const directDiscountAmount = (amount * directDiscount) / 100;
    amount -= directDiscountAmount;
    
    let localUsed = 0;
    let networkUsed = 0;

    if (useCredits) {
      // Then apply local credits
      const availableLocal = localCredits;
      localUsed = Math.min(amount, availableLocal);
      amount -= localUsed;

      // Then apply network credits
      if (amount > 0) {
        const availableNetwork = networkCredits;
        networkUsed = Math.min(amount, availableNetwork);
        amount -= networkUsed;
      }
    }

    return {
      originalAmount: currentAmount,
      directDiscountAmount,
      localCreditsUsed: localUsed,
      networkCreditsUsed: networkUsed,
      finalAmount: Math.max(0, amount),
      totalSavings: directDiscountAmount + localUsed + networkUsed
    };
  };

  const calculation = calculatePayment();

  const handlePayment = async () => {
    if (allowBillInput && (!inputAmount || parseFloat(inputAmount) <= 0)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bill amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Generate payment code
      const paymentCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onPaymentComplete({
        paymentCode,
        totalSavings: calculation.totalSavings,
        originalAmount: calculation.originalAmount,
        finalAmount: calculation.finalAmount,
        creditsUsed: calculation.localCreditsUsed + calculation.networkCreditsUsed,
        directDiscountAmount: calculation.directDiscountAmount
      });
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAvailableCredits = localCredits + networkCredits;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Input */}
          {allowBillInput && (
            <div className="space-y-2">
              <Label htmlFor="billAmount">Bill Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="billAmount"
                  type="number"
                  placeholder="0.00"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="pl-8 text-lg font-semibold"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Original Amount */}
          <div className="flex justify-between items-center">
            <span>Bill Amount:</span>
            <span className="font-medium">₹{currentAmount.toFixed(2)}</span>
          </div>

          {/* Credit Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label htmlFor="use-credits" className="text-base">
                Use available credits
              </Label>
              <Badge variant="secondary">
                ₹{totalAvailableCredits.toFixed(2)} available
              </Badge>
            </div>
            <Switch
              id="use-credits"
              checked={useCredits}
              onCheckedChange={setUseCredits}
            />
          </div>

          {/* Discount & Credit Breakdown */}
          {(calculation.directDiscountAmount > 0 || (useCredits && calculation.totalSavings > 0)) && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium">Savings Applied</h4>
              {calculation.directDiscountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Direct Discount ({directDiscount}%):</span>
                  <span className="text-green-600">-₹{calculation.directDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              {calculation.localCreditsUsed > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Local Credits:</span>
                  <span className="text-green-600">-₹{calculation.localCreditsUsed.toFixed(2)}</span>
                </div>
              )}
              {calculation.networkCreditsUsed > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Network Credits:</span>
                  <span className="text-green-600">-₹{calculation.networkCreditsUsed.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Final Amount */}
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total to Pay:</span>
            <span className={calculation.finalAmount === 0 ? "text-green-600" : ""}>
              {calculation.finalAmount === 0 ? "FREE" : `₹${calculation.finalAmount.toFixed(2)}`}
            </span>
          </div>

          {/* Motivation Message */}
          {calculation.totalSavings > 0 && (
            <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <Gift className="w-4 h-4" />
                <span className="font-medium">
                  Total Savings: ₹{calculation.totalSavings.toFixed(2)}!
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Amazing! You're saving big! 🎉
              </p>
            </div>
          )}

          {/* Payment Button */}
          <Button 
            onClick={handlePayment}
            disabled={isProcessing || (allowBillInput && currentAmount <= 0)}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              "Processing..."
            ) : calculation.finalAmount === 0 ? (
              "Complete Free Purchase"
            ) : (
              `Pay ₹${calculation.finalAmount.toFixed(2)}`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}