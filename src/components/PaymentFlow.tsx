import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Gift, Zap } from 'lucide-react';
import { PaymentInstructions } from '@/components/PaymentInstructions';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/utils/userIdManager';

interface PaymentFlowProps {
  billAmount: number;
  localCredits: number;
  networkCredits: number;
  merchantName?: string;
  merchantId?: string;
  dealId?: string;
  allowBillInput?: boolean;
  directDiscount?: number; // Direct discount percentage (0-100)
  cashbackPercentage?: number; // Cashback percentage for display (0-100)
  isInAppPayment?: boolean;
  onPaymentComplete: (result: PaymentResult) => void;
}

interface PaymentResult {
  paymentCode: string;
  totalSavings: number;
  originalAmount: number;
  finalAmount: number;
  localCreditsUsed: number;
  networkCreditsUsed: number;
  directDiscountAmount?: number;
}

export default function PaymentFlow({
  billAmount: originalBillAmount,
  localCredits,
  networkCredits,
  merchantName = "Merchant",
  merchantId,
  dealId,
  allowBillInput = false,
  directDiscount = 0,
  cashbackPercentage = 0,
  isInAppPayment = false,
  onPaymentComplete
}: PaymentFlowProps) {
  const { toast } = useToast();
  const [useCredits, setUseCredits] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputAmount, setInputAmount] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

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
      // Create pending transaction with credit information
      const anonymousUserId = getUserId();
      const { data, error } = await supabase.functions.invoke('createPendingTransaction', {
        body: {
          merchantId,
          originalAmount: calculation.originalAmount,
          dealId,
          localCreditsUsed: calculation.localCreditsUsed,
          networkCreditsUsed: calculation.networkCreditsUsed,
          anonymousUserId
        }
      });

      if (error) throw error;

      const result: PaymentResult = {
        paymentCode: data.data.paymentCode,
        totalSavings: calculation.totalSavings,
        originalAmount: calculation.originalAmount,
        finalAmount: calculation.finalAmount,
        localCreditsUsed: calculation.localCreditsUsed,
        networkCreditsUsed: calculation.networkCreditsUsed,
        directDiscountAmount: calculation.directDiscountAmount
      };
      
      setPaymentResult(result);
      
      if (isInAppPayment) {
        // For in-app payments, call onPaymentComplete immediately
        onPaymentComplete(result);
      } else {
        // For manual QR payments, show instructions
        setShowInstructions(true);
      }
      
    } catch (error) {
      console.error('Payment creation failed:', error);
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

  // Show payment instructions for manual QR payments
  if (showInstructions && paymentResult) {
    return (
      <PaymentInstructions
        finalAmount={paymentResult.finalAmount}
        localCreditsUsed={paymentResult.localCreditsUsed}
        networkCreditsUsed={paymentResult.networkCreditsUsed}
        merchantName={merchantName}
        paymentCode={paymentResult.paymentCode}
        isInAppPayment={isInAppPayment}
      />
    );
  }

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

          {/* Estimated Cashback */}
          {cashbackPercentage > 0 && (
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700 dark:text-green-300">Estimated cashback:</span>
                <span className="font-medium text-green-700 dark:text-green-300">
                  ₹{((currentAmount * cashbackPercentage) / 100).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                You'll earn this back after payment validation
              </p>
            </div>
          )}

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
            variant="cta"
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