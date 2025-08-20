import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { QrCode, CreditCard, Gift, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/utils/userIdManager';
import MerchantPaymentCode from './MerchantPaymentCode';

interface QuickPaymentFlowProps {
  grabData: any;
  localCredits: number;
  networkCredits: number;
  onComplete: (result: any) => void;
}

export default function QuickPaymentFlow({
  grabData,
  localCredits,
  networkCredits,
  onComplete
}: QuickPaymentFlowProps) {
  const { toast } = useToast();
  const [billAmount, setBillAmount] = useState('');
  const [useCredits, setUseCredits] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const totalCredits = localCredits + networkCredits;
  const amount = parseFloat(billAmount) || 0;
  const directDiscount = (amount * (grabData?.deals?.discount_pct || 0)) / 100;
  const amountAfterDiscount = amount - directDiscount;
  
  const creditsToUse = useCredits ? Math.min(Math.floor(amountAfterDiscount * 100), Math.floor(totalCredits * 100)) / 100 : 0;
  const finalAmount = Math.max(0, amountAfterDiscount - creditsToUse);
  const totalSavings = directDiscount + creditsToUse;
  
  // Calculate cashback earnings
  const cashbackPct = grabData?.deals?.cashback_pct || 0;
  const cashbackEarned = (finalAmount * cashbackPct) / 100;

  const generateQRCode = async () => {
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
      
      // Create pending transaction via edge function
      const { data, error } = await supabase.functions.invoke('createPendingTransaction', {
        body: {
          merchantId: grabData?.merchant_id,
          originalAmount: amount,
          grabId: grabData?.id,
          dealId: grabData?.deal_id,
          anonymousUserId,
          localCreditsUsed,
          networkCreditsUsed
        }
      });

      if (error) throw error;
      
      const result = {
        billAmount: amount,
        directDiscount,
        creditsUsed: creditsToUse,
        finalAmount,
        totalSavings,
        paymentCode: data.paymentCode,
        expiresAt: data.expiresAt,
        merchantName: data.merchantName,
        dealTitle: grabData?.deals?.title,
        hasCreditsApplied: creditsToUse > 0,
        isFullyCovered: finalAmount === 0
      };
      
      setPaymentResult(result);
      onComplete(result);
      
      toast({
        title: "Payment Code Generated!",
        description: "Show this code to the cashier for validation"
      });
      
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to generate payment code",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToEdit = () => {
    setPaymentResult(null);
  };

  // Show payment code inline after generation
  if (paymentResult) {
    return (
      <MerchantPaymentCode
        paymentResult={paymentResult}
        onBack={handleBackToEdit}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Get Payment Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deal Info */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm">
            {grabData?.deals?.title}
          </h3>
          <div className="flex gap-2 mt-1">
            {grabData?.deals?.discount_pct > 0 && (
              <Badge variant="secondary" className="text-xs">
                {grabData.deals.discount_pct}% OFF
              </Badge>
            )}
            {grabData?.deals?.cashback_pct > 0 && (
              <Badge variant="outline" className="text-xs">
                {grabData.deals.cashback_pct}% Cashback
              </Badge>
            )}
          </div>
        </div>

        {/* Bill Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="billAmount">Your Purchase Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
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
                ₹{totalCredits.toFixed(2)} available
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
                  Using ₹{creditsToUse.toFixed(2)} credits now saves you money immediately
                </p>
              </div>
            ) : (
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-blue-700 dark:text-blue-300 font-medium">💎 Accumulate & Save More!</p>
                <p className="text-blue-600 dark:text-blue-400">
                  Keep your ₹{totalCredits.toFixed(2)} + earn ₹{cashbackEarned.toFixed(2)} more = ₹{(totalCredits + cashbackEarned).toFixed(2)} for bigger savings!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Savings Breakdown */}
        {amount > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium">Your Savings</h4>
            {directDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Deal Discount:</span>
                <span className="text-green-600">-₹{directDiscount.toFixed(2)}</span>
              </div>
            )}
            {creditsToUse > 0 && (
              <div className="flex justify-between text-sm">
                <span>Credits Applied:</span>
                <span className="text-green-600">-₹{creditsToUse.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>You Pay:</span>
              <span className={finalAmount === 0 ? "text-green-600" : ""}>
                {finalAmount === 0 ? "FREE!" : `₹${finalAmount.toFixed(2)}`}
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
                Total Savings: ₹{totalSavings.toFixed(2)}! 🎉
              </span>
            </div>
          </div>
        )}

        {/* Cashback Earnings Motivation */}
        {cashbackEarned > 0 && (
          <div className="text-center bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
              <Zap className="w-4 h-4" />
              <span className="font-medium">You'll Earn Back: ₹{cashbackEarned.toFixed(2)}</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {cashbackPct}% cashback for your next purchase! 💰
            </p>
          </div>
        )}

        {/* Generate QR Button */}
        <Button 
          onClick={generateQRCode}
          disabled={isProcessing || !billAmount || amount <= 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            "Generating..."
          ) : finalAmount === 0 ? (
            <>
              <QrCode className="w-4 h-4 mr-2" />
              Get FREE Purchase Code
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4 mr-2" />
              Get Payment Code
            </>
          )}
        </Button>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300">
          <p className="font-medium mb-1">How it works:</p>
          <ol className="space-y-1">
            <li>1. Enter your purchase amount above</li>
            <li>2. Choose to use credits (optional)</li>
            <li>3. Show the generated code to cashier</li>
            <li>4. {finalAmount === 0 ? "Enjoy your free purchase!" : "Pay cashier the remaining amount"}</li>
            {cashbackEarned > 0 && (
              <li className="font-medium text-purple-700 dark:text-purple-300">
                5. Earn ₹{cashbackEarned.toFixed(2)} credits for next time! 🎁
              </li>
            )}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}