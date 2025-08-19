import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, Zap, Check, ArrowRight } from 'lucide-react';

interface PaymentFlowProps {
  originalAmount?: number; // in cents - optional, if not provided shows input
  localCredits: number; // in cents
  networkCredits: number; // in cents
  merchantId?: string;
  onPaymentComplete?: (paymentDetails: PaymentResult) => void;
  autoApplyCredits?: boolean;
  allowAmountInput?: boolean; // Allow user to input amount
}

interface PaymentResult {
  originalAmount: number;
  localCreditsUsed: number;
  networkCreditsUsed: number;
  finalAmount: number;
  totalSavings: number;
  creditsUsed: number;
  paymentCode: string;
}

export default function PaymentFlow({
  originalAmount = 0,
  localCredits,
  networkCredits,
  merchantId,
  onPaymentComplete,
  autoApplyCredits = false,
  allowAmountInput = false
}: PaymentFlowProps) {
  const { toast } = useToast();
  const [useCredits, setUseCredits] = useState(autoApplyCredits);
  const [isProcessing, setIsProcessing] = useState(false);
  const [billAmount, setBillAmount] = useState<string>("");
  
  // Use input amount if allowed, otherwise use original amount
  const currentAmount = allowAmountInput 
    ? (parseFloat(billAmount) || 0) * 100  // Convert dollars to cents
    : originalAmount;

  // Calculate credit application
  const calculatePayment = (): PaymentResult => {
    if (!useCredits || currentAmount <= 0) {
    return {
      originalAmount: currentAmount,
      localCreditsUsed: 0,
      networkCreditsUsed: 0,
      finalAmount: currentAmount,
      totalSavings: 0,
      creditsUsed: 0,
      paymentCode: ''
    };
    }

    let remainingAmount = currentAmount;
    let localCreditsUsed = 0;
    let networkCreditsUsed = 0;

    // Step 1: Apply local credits first
    if (remainingAmount > 0 && localCredits > 0) {
      localCreditsUsed = Math.min(remainingAmount, localCredits);
      remainingAmount -= localCreditsUsed;
    }

    // Step 2: Apply network credits second
    if (remainingAmount > 0 && networkCredits > 0) {
      networkCreditsUsed = Math.min(remainingAmount, networkCredits);
      remainingAmount -= networkCreditsUsed;
    }

    return {
      originalAmount: currentAmount,
      localCreditsUsed,
      networkCreditsUsed,
      finalAmount: remainingAmount,
      totalSavings: localCreditsUsed + networkCreditsUsed,
      creditsUsed: localCreditsUsed + networkCreditsUsed,
      paymentCode: ''
    };
  };

  const paymentResult = calculatePayment();
  const totalAvailableCredits = localCredits + networkCredits;
  const canCoverFull = totalAvailableCredits >= originalAmount;

  const handlePayment = async () => {
    if (allowAmountInput && (!billAmount || parseFloat(billAmount) <= 0)) {
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
      
      const result = {
        ...paymentResult,
        paymentCode
      };

      onPaymentComplete?.(result);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Input or Display */}
        {allowAmountInput ? (
          <div className="space-y-2">
            <label htmlFor="billAmount" className="text-base font-medium">Bill Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <input
                id="billAmount"
                type="number"
                placeholder="0.00"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-input bg-background rounded-md text-lg font-semibold"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-base">Subtotal</span>
            <span className="text-lg font-semibold">
              ${(currentAmount / 100).toFixed(2)}
            </span>
          </div>
        )}

        <Separator />

        {/* Credit Toggle */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label htmlFor="use-credits" className="text-base">
              Use available credits
            </Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                ${(totalAvailableCredits / 100).toFixed(2)} available
              </Badge>
              {canCoverFull && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Can cover full amount!
                </Badge>
              )}
            </div>
          </div>
          <Switch
            id="use-credits"
            checked={useCredits}
            onCheckedChange={setUseCredits}
          />
        </div>

        {/* Credit Breakdown */}
        {useCredits && (paymentResult.localCreditsUsed > 0 || paymentResult.networkCreditsUsed > 0) && (
          <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Credits Applied
            </h4>
            
            {paymentResult.localCreditsUsed > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</div>
                  <span className="text-sm">Local Credits</span>
                </div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  -${(paymentResult.localCreditsUsed / 100).toFixed(2)}
                </span>
              </div>
            )}

            {paymentResult.networkCreditsUsed > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center">2</div>
                  <span className="text-sm">Network Credits</span>
                </div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  -${(paymentResult.networkCreditsUsed / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Final Amount */}
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total to Pay</span>
          <div className="text-right">
            {paymentResult.totalSavings > 0 && (
              <div className="text-sm text-green-600 dark:text-green-400">
                You save ${(paymentResult.totalSavings / 100).toFixed(2)}!
              </div>
            )}
            <span className={paymentResult.finalAmount === 0 ? "text-green-600 dark:text-green-400" : ""}>
              {paymentResult.finalAmount === 0 ? "FREE" : `$${(paymentResult.finalAmount / 100).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full h-12 text-base"
          size="lg"
        >
          {isProcessing ? (
            "Processing..."
          ) : paymentResult.finalAmount === 0 ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Complete Free Purchase
            </>
          ) : (
            <>
              <DollarSign className="h-5 w-5 mr-2" />
              Pay ${(paymentResult.finalAmount / 100).toFixed(2)}
            </>
          )}
        </Button>

        {/* Motivation Message */}
        {paymentResult.totalSavings > 0 && (
          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              🎉 Amazing! You just saved ${(paymentResult.totalSavings / 100).toFixed(2)} with your credits!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Keep earning to unlock even bigger savings!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}