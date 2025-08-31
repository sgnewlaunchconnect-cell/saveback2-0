import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, CreditCard, Gift, Zap, Smartphone, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/utils/userIdManager';
import { useDemoMode } from '@/hooks/useDemoMode';
import MerchantPaymentCode from './MerchantPaymentCode';
import StripePaymentForm from './StripePaymentForm';
import ProofOfPaymentQR from './ProofOfPaymentQR';
import PaymentSuccess from './PaymentSuccess';

interface QuickPaymentFlowProps {
  grabData: any;
  localCredits: number;
  networkCredits: number;
  merchantData?: any;
  onComplete: (result: any) => void;
  isStaticQr?: boolean;
}

export default function QuickPaymentFlow({ 
  grabData, 
  localCredits, 
  networkCredits, 
  merchantData,
  onComplete,
  isStaticQr = false
}: QuickPaymentFlowProps) {
  const { toast } = useToast();
  const { isDemoMode, mockSupabaseCall } = useDemoMode();
  const [billAmount, setBillAmount] = useState('');
  const [useCredits, setUseCredits] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [stripePayment, setStripePayment] = useState<{
    clientSecret: string;
    paymentIntentId: string;
    pendingTransactionId: string;
    amount: number;
  } | null>(null);
  
  // Default to PSP if enabled, otherwise payment code
  const isPspEnabled = merchantData?.psp_enabled || false;
  const [paymentMethod, setPaymentMethod] = useState<'psp' | 'code'>(isPspEnabled ? 'psp' : 'code');

  const totalCredits = localCredits + networkCredits;
  const amount = parseFloat(billAmount) || 0;
  const directDiscount = (amount * (grabData?.deals?.discount_pct || 0)) / 100;
  const amountAfterDiscount = amount - directDiscount;
  
  const creditsToUse = useCredits ? Math.min(Math.floor(amountAfterDiscount * 100), Math.floor(totalCredits * 100)) / 100 : 0;
  const finalAmount = Math.max(0, amountAfterDiscount - creditsToUse);
  const totalSavings = directDiscount + creditsToUse;
  
  // Calculate PSP fees if applicable
  const feeFixed = merchantData?.psp_fee_fixed_cents || 30;
  const feePct = merchantData?.psp_fee_pct || 2.9;
  const feeAmount = paymentMethod === 'psp' && isPspEnabled ? Math.round(feeFixed + (finalAmount * feePct / 100)) / 100 : 0;
  const feeMode = merchantData?.psp_fee_mode || 'pass';
  
  // Adjust final amount based on fee mode for PSP
  let finalAmountWithFees = finalAmount;
  if (paymentMethod === 'psp' && isPspEnabled && feeMode === 'pass') {
    finalAmountWithFees = finalAmount + feeAmount;
  }
  
  // Calculate cashback earnings - use deal cashback first, then merchant default
  const dealCashbackPct = grabData?.deals?.cashback_pct || 0;
  const defaultCashbackPct = (!dealCashbackPct && merchantData?.default_reward_mode === 'CASHBACK') ? (merchantData?.default_cashback_pct || 0) : 0;
  const cashbackPct = dealCashbackPct || defaultCashbackPct;
  const cashbackEarned = (finalAmount * cashbackPct) / 100;

  const handlePayment = async () => {
    if (!billAmount || amount <= 0) {
      toast({
        title: "Enter Bill Amount",
        description: "Please enter your purchase amount",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const anonymousUserId = getUserId();
      
      // Calculate credit split (prioritize local credits first)
      const localCreditsUsed = Math.floor(Math.min(creditsToUse * 100, localCredits * 100));
      const networkCreditsUsed = Math.floor(creditsToUse * 100) - localCreditsUsed;
      
      if (paymentMethod === 'psp') {
        // PSP payment flow
        console.debug('Attempting PSP payment for merchant:', grabData?.merchant_id || merchantData?.id);
        console.debug('Merchant PSP enabled:', isPspEnabled);
        
        if (!isPspEnabled) {
          toast({
            title: "PSP Not Available",
            description: "This merchant doesn't support in-app payments. Please use payment code instead.",
            variant: "destructive"
          });
          setPaymentMethod('code');
          setIsProcessing(false);
          return;
        }
        
        let response;
        if (isDemoMode) {
          response = await mockSupabaseCall('create-payment', {
            merchantId: grabData?.merchant_id || merchantData?.id,
            originalAmount: amount,
            grabId: grabData?.id,
            dealId: grabData?.deal_id,
            anonymousUserId,
            localCreditsUsed,
            networkCreditsUsed
          });
        } else {
          response = await supabase.functions.invoke('create-payment', {
            body: {
              merchantId: grabData?.merchant_id || merchantData?.id,
              originalAmount: amount,
              grabId: grabData?.id,
              dealId: grabData?.deal_id,
              anonymousUserId,
              localCreditsUsed,
              networkCreditsUsed
            }
          });
        }
        
        const { data, error } = response;
        if (error) throw error;
        
        if (data.clientSecret) {
          // Set up in-app payment
          setStripePayment({
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId,
            pendingTransactionId: data.pendingTransactionId,
            amount: Math.round(finalAmountWithFees * 100) // Convert to paise
          });
        } else {
          throw new Error("Failed to create payment session");
        }
        
      } else {
        // Payment code flow
        let response;
        if (isDemoMode) {
          response = await mockSupabaseCall('createPendingTransaction', {
            merchantId: grabData?.merchant_id || merchantData?.id,
            originalAmount: amount,
            grabId: grabData?.id,
            dealId: grabData?.deal_id,
            anonymousUserId,
            localCreditsUsed,
            networkCreditsUsed
          });
        } else {
          response = await supabase.functions.invoke('createPendingTransaction', {
            body: {
              merchantId: grabData?.merchant_id || merchantData?.id,
              originalAmount: amount,
              grabId: grabData?.id,
              dealId: grabData?.deal_id,
              anonymousUserId,
              localCreditsUsed,
              networkCreditsUsed
            }
          });
        }
        
        const { data, error } = response;
        if (error) throw error;
        
        const result = {
          billAmount: amount,
          directDiscount,
          creditsUsed: creditsToUse,
          finalAmount,
          totalSavings,
          paymentCode: data.data.paymentCode,
          expiresAt: data.data.expiresAt,
          merchantName: data.data.merchantName,
          dealTitle: grabData?.deals?.title,
          hasCreditsApplied: creditsToUse > 0,
          isFullyCovered: finalAmount === 0,
          paymentMethod: 'code',
          pendingTransactionId: data.data.transactionId
        };
        
        console.debug('Payment code generated for validation:', {
          paymentCode: data.data.paymentCode,
          fullResponse: data.data
        });
        
        setPaymentResult(result);
        onComplete(result);
        
        toast({
          title: "Payment Code Generated!",
          description: "Show this code to the cashier for validation"
        });
      }
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: paymentMethod === 'psp' ? "Failed to create payment session" : "Failed to generate payment code",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToEdit = () => {
    setPaymentResult(null);
    setStripePayment(null);
  };

  const handleStripeSuccess = async (result: any) => {
    setStripePayment(null);
    
    // Poll for transaction status to ensure it's completed
    let retryCount = 0;
    const maxRetries = 10; // 30 seconds max
    
    const pollForCompletion = async (): Promise<boolean> => {
      try {
        const { data, error } = await supabase.functions.invoke('checkPendingStatus', {
          body: { paymentCode: result.paymentCode }
        });
        
        if (!error && data?.data?.status === 'completed') {
          return true;
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 3000));
          return pollForCompletion();
        }
        
        return false;
      } catch (error) {
        console.error('Error polling status:', error);
        return false;
      }
    };
    
    const isCompleted = await pollForCompletion();
    
    if (isCompleted) {
      // Show success screen for completed payment
      const successResult = {
        ...result,
        paymentMethod: 'stripe',
        showSuccess: true,
        merchantName: merchantData?.name || 'Merchant',
        timestamp: new Date().toLocaleString()
      };
      
      setPaymentResult(successResult);
      onComplete(successResult);
    } else {
      // Fallback to proof QR if verification times out
      const stripeResult = {
        ...result,
        paymentMethod: 'stripe',
        showProofQR: true,
        merchantName: merchantData?.name || 'Merchant',
        timestamp: new Date().toLocaleString()
      };
      
      setPaymentResult(stripeResult);
      onComplete(stripeResult);
    }
  };

  const handleStripeError = (error: string) => {
    setStripePayment(null);
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  // Show Stripe payment form
  if (stripePayment) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToEdit} className="mb-4">
          ← Back to Payment Options
        </Button>
        <StripePaymentForm
          clientSecret={stripePayment.clientSecret}
          paymentIntentId={stripePayment.paymentIntentId}
          pendingTransactionId={stripePayment.pendingTransactionId}
          amount={stripePayment.amount}
          merchantName={grabData?.deals?.merchant_name || merchantData?.name || "Merchant"}
          onSuccess={handleStripeSuccess}
          onError={handleStripeError}
        />
      </div>
    );
  }

  // Show payment code inline after generation
  if (paymentResult && paymentResult.paymentMethod === 'code') {
    return (
      <MerchantPaymentCode
        paymentResult={paymentResult}
        onBack={handleBackToEdit}
        merchantData={merchantData}
        grabData={grabData}
      />
    );
  }

  // If we have Stripe payment result with success confirmation, show PaymentSuccess
  if (paymentResult && paymentResult.paymentMethod === 'stripe' && paymentResult.showSuccess) {
    return (
      <PaymentSuccess
        paymentCode={paymentResult.paymentCode}
        totalSavings={totalSavings}
        originalAmount={amount}
        finalAmount={finalAmountWithFees}
        creditsUsed={creditsToUse}
        directDiscountAmount={directDiscount}
        onContinue={handleBackToEdit}
      />
    );
  }

  // If we have Stripe payment result, show proof of payment QR
  if (paymentResult && paymentResult.paymentMethod === 'stripe' && paymentResult.showProofQR) {
    return (
      <ProofOfPaymentQR
        paymentIntentId={paymentResult.transactionId}
        merchantName={paymentResult.merchantName}
        amount={finalAmountWithFees * 100} // Convert to cents
        timestamp={paymentResult.timestamp}
        onContinue={handleBackToEdit}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Choose Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Payment Method Selection */}
        {isPspEnabled && (
          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'psp' | 'code')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="psp" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Pay In-App
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Payment Code
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {/* Deal Info */}
        {grabData?.deals ? (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm">
              {grabData.deals.title}
            </h3>
            <div className="flex gap-2 mt-1">
              {grabData.deals.discount_pct > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {grabData.deals.discount_pct}% OFF
                </Badge>
              )}
              {grabData.deals.cashback_pct > 0 && (
                <Badge variant="outline" className="text-xs">
                  {grabData.deals.cashback_pct}% Cashback
                </Badge>
              )}
            </div>
          </div>
        ) : cashbackPct > 0 ? (
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600 dark:text-green-400" />
              <h3 className="font-medium text-green-800 dark:text-green-200 text-sm">
                Earn {cashbackPct}% credits on this payment at {merchantData?.name}
              </h3>
            </div>
          </div>
        ) : null}

        {/* Bill Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="billAmount">Your Purchase Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="billAmount"
              type="number"
              placeholder="0.00"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
              className="pl-8 text-lg font-semibold"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {/* Credits Toggle */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between space-x-2 mb-3">
            <div className="space-y-1">
              <Label htmlFor="use-credits" className="text-sm font-medium">
                Apply Credits Now?
              </Label>
              <Badge variant="secondary" className="text-xs">
                ${totalCredits.toFixed(2)} available
              </Badge>
            </div>
            <Switch
              id="use-credits"
              checked={useCredits}
              onCheckedChange={setUseCredits}
            />
          </div>
          
          {/* Decision Helper Text */}
          <div className="space-y-2 text-xs">
            {useCredits ? (
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 font-medium">✨ Smart Choice!</p>
                <p className="text-green-600 dark:text-green-400">
                  Using ${creditsToUse.toFixed(2)} credits now saves you money immediately
                </p>
              </div>
            ) : (
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-blue-700 dark:text-blue-300 font-medium">💎 Accumulate & Save More!</p>
                <p className="text-blue-600 dark:text-blue-400">
                  Keep your ${totalCredits.toFixed(2)} + earn ${cashbackEarned.toFixed(2)} more = ${(totalCredits + cashbackEarned).toFixed(2)} for bigger savings!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Savings Breakdown */}
        {amount > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium">Payment Summary</h4>
            <div className="flex justify-between text-sm">
              <span>Bill Amount:</span>
              <span>${amount.toFixed(2)}</span>
            </div>
            {directDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Deal Discount:</span>
                <span className="text-green-600">-${directDiscount.toFixed(2)}</span>
              </div>
            )}
            {creditsToUse > 0 && (
              <div className="flex justify-between text-sm">
                <span>Credits Applied:</span>
                <span className="text-green-600">-${creditsToUse.toFixed(2)}</span>
              </div>
            )}
            {paymentMethod === 'psp' && feeAmount > 0 && feeMode === 'pass' && (
              <div className="flex justify-between text-sm">
                <span>Payment Fee:</span>
                <span className="text-orange-600">+${feeAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>You Pay:</span>
              <span className={finalAmountWithFees === 0 ? "text-green-600" : ""}>
                {finalAmountWithFees === 0 ? "FREE!" : `$${finalAmountWithFees.toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        {/* Total Savings Highlight */}
        {totalSavings > 0 && (
          <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <Gift className="w-4 h-4" />
              <span className="font-medium">
                Total Savings: ${totalSavings.toFixed(2)}! 🎉
              </span>
            </div>
          </div>
        )}

        {/* Cashback Earnings Motivation */}
        {cashbackEarned > 0 && (
          <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
              <Zap className="w-4 h-4" />
              <span className="font-medium">You'll Earn Back: ${cashbackEarned.toFixed(2)}</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {cashbackPct}% cashback for your next purchase! 💰
            </p>
          </div>
        )}

        {/* Payment Action Button */}
        <Button 
          onClick={handlePayment}
          disabled={isProcessing || !billAmount || amount <= 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              {paymentMethod === 'psp' ? (
                <Smartphone className="w-4 h-4 mr-2" />
              ) : (
                <QrCode className="w-4 h-4 mr-2" />
              )}
              Claim Now
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">How it works:</p>
          <ol className="space-y-1">
            <li>1. Enter your purchase amount above</li>
            <li>2. Choose to use credits (optional)</li>
            {paymentMethod === 'psp' ? (
              <>
                <li>3. Complete payment securely via Stripe</li>
                <li>4. Credits and cashback applied automatically</li>
                <li>5. No merchant validation needed!</li>
              </>
            ) : (
              <>
                <li>3. We'll generate a QR code for your purchase</li>
                <li>4. Ask the merchant to scan the code</li>
                <li>5. Pay the final amount shown to complete</li>
              </>
            )}
            {cashbackEarned > 0 && (
              <li className="font-medium text-purple-700 dark:text-purple-300">
                {paymentMethod === 'psp' ? '6' : '7'}. Earn ${cashbackEarned.toFixed(2)} credits for next time! 🎁
              </li>
            )}
          </ol>
          
          {paymentMethod === 'psp' && feeAmount > 0 && feeMode === 'pass' && (
            <p className="mt-2 text-orange-600 dark:text-orange-400 font-medium">
              Note: ${feeAmount.toFixed(2)} payment processing fee included
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}