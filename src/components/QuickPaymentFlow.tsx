import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, CreditCard, Gift, Zap, Smartphone, DollarSign, User, Store, Play, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/utils/userIdManager';
import { useDemoMode } from '@/hooks/useDemoMode';
import MerchantPaymentCode from './MerchantPaymentCode';
import StripePaymentForm from './StripePaymentForm';
import ProofOfPaymentQR from './ProofOfPaymentQR';
import PaymentSuccess from './PaymentSuccess';
import MerchantValidationSimulator from './MerchantValidationSimulator';

interface QuickPaymentFlowProps {
  grabData: any;
  localCredits: number;
  networkCredits: number;
  merchantData?: any;
  onComplete: (result: any) => void;
  isStaticQr?: boolean;
  paymentFlow?: 'flow1' | 'flow2';
}

export default function QuickPaymentFlow({ 
  grabData, 
  localCredits, 
  networkCredits, 
  merchantData,
  onComplete,
  isStaticQr = false,
  paymentFlow = 'flow1'
}: QuickPaymentFlowProps) {
  const { toast } = useToast();
  const { isDemoMode, mockSupabaseCall, startDemo } = useDemoMode();
  const [selectedFlow, setSelectedFlow] = useState<'flow1' | 'flow2'>(paymentFlow);
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
  const [showDemo, setShowDemo] = useState(false);
  const [showValidationSimulator, setShowValidationSimulator] = useState(false);

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
    // For Flow 2, amount is entered by merchant, not required here
    if (selectedFlow === 'flow1' && (!billAmount || amount <= 0)) {
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
            originalAmount: selectedFlow === 'flow1' ? amount : null,
            grabId: grabData?.id,
            dealId: grabData?.deal_id,
            anonymousUserId,
            localCreditsUsed: selectedFlow === 'flow1' ? localCreditsUsed : 0,
            networkCreditsUsed: selectedFlow === 'flow1' ? networkCreditsUsed : 0,
            amountEntryMode: selectedFlow === 'flow1' ? 'customer' : 'merchant'
          });
        } else {
          response = await supabase.functions.invoke('createPendingTransaction', {
            body: {
              merchantId: grabData?.merchant_id || merchantData?.id,
              originalAmount: selectedFlow === 'flow1' ? amount : null,
              grabId: grabData?.id,
              dealId: grabData?.deal_id,
              anonymousUserId,
              localCreditsUsed: selectedFlow === 'flow1' ? localCreditsUsed : 0,
              networkCreditsUsed: selectedFlow === 'flow1' ? networkCreditsUsed : 0,
              amountEntryMode: selectedFlow === 'flow1' ? 'customer' : 'merchant'
            }
          });
        }
        
        const { data, error } = response;
        if (error) throw error;
        
        const result = {
          billAmount: selectedFlow === 'flow1' ? amount : null,
          originalAmount: selectedFlow === 'flow1' ? amount : null,
          directDiscount: selectedFlow === 'flow1' ? directDiscount : 0,
          creditsUsed: selectedFlow === 'flow1' ? creditsToUse : 0,
          localCreditsUsed: selectedFlow === 'flow1' ? localCreditsUsed : 0,
          networkCreditsUsed: selectedFlow === 'flow1' ? networkCreditsUsed : 0,
          finalAmount: selectedFlow === 'flow1' ? finalAmount : null,
          totalSavings: selectedFlow === 'flow1' ? totalSavings : 0,
          paymentCode: data.data.paymentCode,
          expiresAt: data.data.expiresAt,
          merchantName: data.data.merchantName,
          dealTitle: grabData?.deals?.title,
          hasCreditsApplied: selectedFlow === 'flow1' ? creditsToUse > 0 : false,
          isFullyCovered: selectedFlow === 'flow1' ? finalAmount === 0 : false,
          paymentMethod: 'code',
          pendingTransactionId: data.data.transactionId,
          paymentFlow: selectedFlow
        };
        
        console.debug('Payment code generated for validation:', {
          paymentCode: data.data.paymentCode,
          fullResponse: data.data
        });
        
        setPaymentResult(result);
        onComplete(result);
        
        toast({
          title: "Payment Code Generated!",
          description: selectedFlow === 'flow1' 
            ? "Show this code to the cashier for validation"
            : "Merchant will generate a QR for you to scan"
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

  // Show payment code inline after generation (Flow 1 only)
  if (paymentResult && paymentResult.paymentMethod === 'code' && paymentResult.paymentFlow === 'flow1') {
    return (
      <MerchantPaymentCode
        paymentResult={paymentResult}
        onBack={handleBackToEdit}
        merchantData={merchantData}
        grabData={grabData}
      />
    );
  }

  // For Flow 2, show scanner interface instead of payment code
  if (paymentResult && paymentResult.paymentMethod === 'code' && paymentResult.paymentFlow === 'flow2') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Ready to Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Scan Merchant's QR Code
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              The merchant will generate a QR code with your bill amount. Use your phone's camera or QR scanner app to scan it.
            </p>
          </div>
          
          <Button 
            onClick={() => setShowValidationSimulator(true)} 
            variant="secondary" 
            className="w-full"
          >
            Demo: What happens next →
          </Button>
          
          <Button onClick={handleBackToEdit} variant="outline" className="w-full">
            ← Back to Payment Options
          </Button>
        </CardContent>
      </Card>
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
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Choose Payment Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Payment Flow Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <Label className="text-sm font-medium mb-3 block">Payment Flow</Label>
            <Tabs value={selectedFlow} onValueChange={(value) => setSelectedFlow(value as 'flow1' | 'flow2')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="flow1" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Flow 1
                </TabsTrigger>
                <TabsTrigger value="flow2" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Flow 2
                </TabsTrigger>
              </TabsList>
              <div className="mt-3 text-xs text-muted-foreground">
                {selectedFlow === 'flow1' ? (
                  <div className="space-y-1">
                    <p className="font-medium">Customer enters amount</p>
                    <p>You input the bill amount and apply credits before payment</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="font-medium">Merchant keys amount</p>
                    <p>Merchant enters bill amount, you scan their QR to pay</p>
                  </div>
                )}
              </div>
            </Tabs>
            
            <Button
              onClick={() => setShowDemo(true)}
              variant="outline"
              size="sm"
              className="w-full mt-3 border-dashed"
            >
              <Play className="w-4 h-4 mr-2" />
              Demo this flow
            </Button>
          </div>
        
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

        {/* Bill Amount Input - Only for Flow 1 */}
        {selectedFlow === 'flow1' && (
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
        )}
        
        {/* Flow 2 Instructions */}
        {selectedFlow === 'flow2' && (
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              You'll Scan Merchant's QR Code
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              The merchant will generate a QR code with the bill amount. You scan their QR code to pay. Credits will be applied automatically based on your settings.
            </p>
          </div>
        )}

        {/* Credits Toggle - Only for Flow 1 */}
        {selectedFlow === 'flow1' && (
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
        )}

        {/* Savings Breakdown - Only for Flow 1 */}
        {selectedFlow === 'flow1' && amount > 0 && (
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
          disabled={isProcessing || (selectedFlow === 'flow1' && (!billAmount || amount <= 0))}
          className="w-full" 
          size="lg"
        >
          {isProcessing ? (
            <>
              <Zap className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : selectedFlow === 'flow1' ? (
            <>
              <Zap className="w-4 h-4 mr-2" />
              {finalAmountWithFees > 0 ? `Claim Now - $${finalAmountWithFees.toFixed(2)}` : "Claim FREE!"}
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4 mr-2" />
              Open Scanner (scan merchant QR)
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="bg-muted/30 rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">How to Use:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            {selectedFlow === 'flow1' ? (
              paymentMethod === 'psp' ? (
                <>
                  <p>1. Select "Pay In-App" method</p>
                  <p>2. Enter your purchase amount</p>
                  <p>3. Choose whether to apply credits</p>
                  <p>4. Complete payment with your card</p>
                </>
              ) : (
                <>
                  <p>1. Enter your purchase amount</p>
                  <p>2. Choose whether to apply credits now</p>
                  <p>3. Show the payment code to the cashier</p>
                  <p>4. Pay the final amount in cash</p>
                </>
              )
            ) : (
              <>
                <p>1. Open the QR scanner</p>
                <p>2. Scan the merchant's payment QR code</p>
                <p>3. Merchant enters bill amount on their terminal</p>
                <p>4. Credits apply automatically, pay remaining balance</p>
              </>
            )}
          </div>
        </div>
        </CardContent>
      </Card>
      
      <MerchantValidationSimulator 
        open={showDemo} 
        onOpenChange={setShowDemo}
        flow={selectedFlow}
        context={{
          merchantName: merchantData?.name || grabData?.deals?.merchant_name,
          dealTitle: grabData?.deals?.title,
          billAmount: selectedFlow === 'flow1' ? amount : undefined
        }}
      />
      
      <MerchantValidationSimulator
        open={showValidationSimulator}
        onOpenChange={setShowValidationSimulator}
        flow={selectedFlow}
        context={{
          merchantName: merchantData?.name,
          dealTitle: grabData?.deal?.title,
          billAmount: parseFloat(billAmount) || 25
        }}
        initialStep={selectedFlow === 'flow2' && paymentResult ? 2 : 1}
        initialMerchantAmount={selectedFlow === 'flow2' && paymentResult ? (parseFloat(billAmount) || 25).toString() : ""}
      />
    </>
  );
}