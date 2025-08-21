import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Gift, Clock, QrCode, Loader2, Eye, AlertCircle, Play, CheckCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';

interface MerchantPaymentCodeProps {
  paymentResult: {
    paymentCode: string;
    expiresAt?: string;
    billAmount: number;
    directDiscount: number;
    creditsUsed: number;
    finalAmount: number;
    totalSavings: number;
    merchantName: string;
    dealTitle: string;
    hasCreditsApplied: boolean;
    isFullyCovered: boolean;
    pendingTransactionId?: string;
  };
  onBack: () => void;
}

export default function MerchantPaymentCode({
  paymentResult,
  onBack
}: MerchantPaymentCodeProps) {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(0);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'validated' | 'completed' | 'voided' | 'expired'>('pending');
  const [isPolling, setIsPolling] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Waiting for cashier to scan...');
  
  // Check if demo mode is enabled
  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';
  
  // Enable demo mode by adding ?demo=1 to current URL
  const enableDemoMode = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('demo', '1');
    window.location.href = currentUrl.toString();
  };

  // Timer effect
  useEffect(() => {
    if (paymentResult.expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(paymentResult.expiresAt!).getTime();
        const remaining = Math.max(0, expiry - now);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
          setTransactionStatus('expired');
          setIsPolling(false);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentResult.expiresAt]);

  // Status polling effect
  useEffect(() => {
    if (!isPolling || !paymentResult.paymentCode) return;

    const pollStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('checkPendingStatus', {
          body: { paymentCode: paymentResult.paymentCode }
        });

        if (error) throw error;

        const status = data.data.status;
        setTransactionStatus(status);

        // Update status message
        switch (status) {
          case 'pending':
            setStatusMessage('Waiting for cashier to scan...');
            break;
          case 'validated':
            setStatusMessage(paymentResult.finalAmount === 0 
              ? 'Verified - Transaction Complete!' 
              : `Verified - Please pay ₹${paymentResult.finalAmount.toFixed(2)} in cash`);
            break;
          case 'completed':
            setStatusMessage('Payment confirmed! Transaction complete.');
            setIsPolling(false);
            toast({
              title: "Payment Confirmed!",
              description: "Your transaction has been completed successfully.",
            });
            break;
          case 'voided':
            setStatusMessage('Transaction cancelled by merchant.');
            setIsPolling(false);
            toast({
              title: "Transaction Cancelled",
              description: "This transaction was cancelled by the merchant.",
              variant: "destructive"
            });
            break;
          case 'expired':
            setStatusMessage('Payment code expired.');
            setIsPolling(false);
            break;
        }

        // Stop polling if transaction is finalized
        if (['completed', 'voided', 'expired'].includes(status)) {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
      }
    };

    // Poll immediately, then every 3 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 3000);

    return () => clearInterval(interval);
  }, [isPolling, paymentResult.paymentCode, paymentResult.finalAmount, toast]);

  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  const isExpired = transactionStatus === 'expired' || (timeLeft === 0 && paymentResult.expiresAt);
  const isCompleted = transactionStatus === 'completed';
  const isVoided = transactionStatus === 'voided';
  const isValidated = transactionStatus === 'validated';

  // Demo functions
  const simulateScan = async () => {
    if (!isDemoMode) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('validatePendingTransaction', {
        body: { 
          paymentCode: paymentResult.paymentCode,
          merchantId: null // Allow any merchant in demo mode
        }
      });

      if (error) throw error;

      toast({
        title: "Demo: Merchant Scanned",
        description: "Transaction has been authorized by merchant",
      });
    } catch (error) {
      console.error('Demo scan error:', error);
      toast({
        title: "Demo Error",
        description: "Failed to simulate merchant scan",
        variant: "destructive"
      });
    }
  };

  const simulateConfirm = async () => {
    if (!isDemoMode || transactionStatus !== 'validated') return;
    
    try {
      const { data, error } = await supabase.functions.invoke('confirmCashCollection', {
        body: { 
          paymentCode: paymentResult.paymentCode,
          merchantId: null // Allow any merchant in demo mode
        }
      });

      if (error) throw error;

      toast({
        title: "Demo: Payment Confirmed",
        description: "Cash collection has been confirmed",
      });
    } catch (error) {
      console.error('Demo confirm error:', error);
      toast({
        title: "Demo Error",
        description: "Failed to simulate payment confirmation",
        variant: "destructive"
      });
    }
  };


  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      <Card className={`${
        isCompleted ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
        isVoided ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
        isExpired ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' :
        isValidated ? 'border-blue-200 bg-blue-50 dark:bg-blue-950/20' :
        'border-gray-200'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 text-center">
            {isPolling && !isCompleted && !isVoided && !isExpired && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
            {isVoided && <AlertCircle className="h-4 w-4 text-red-600" />}
            {isExpired && <Clock className="h-4 w-4 text-orange-600" />}
            {isValidated && <Eye className="h-4 w-4 text-blue-600" />}
            <span className={`text-sm font-medium ${
              isCompleted ? 'text-green-700 dark:text-green-300' :
              isVoided ? 'text-red-700 dark:text-red-300' :
              isExpired ? 'text-orange-700 dark:text-orange-300' :
              isValidated ? 'text-blue-700 dark:text-blue-300' :
              'text-gray-700 dark:text-gray-300'
            }`}>
              {statusMessage}
            </span>
          </div>
          
          {/* Demo controls - inline after status */}
          <div className="mt-3 text-center">
            {/* Enable Demo link when demo is not active */}
            {!isDemoMode && (
              <button
                onClick={enableDemoMode}
                className="text-xs text-purple-600 hover:text-purple-700 underline"
              >
                Enable Demo Mode
              </button>
            )}
            
            {/* Demo: Confirm Payment button when validated */}
            {isDemoMode && isValidated && (
              <Button 
                onClick={simulateConfirm}
                variant="outline" 
                size="sm" 
                className="border-purple-300 text-purple-700 hover:bg-purple-100 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Demo: Confirm Payment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Code Display */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            {isCompleted ? 'Payment Complete' : 'Payment Code'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QR Code for Merchant Scanning */}
          <div className={`text-center p-6 rounded-lg border-2 border-dashed ${
            isExpired ? 'bg-red-50 dark:bg-red-950/20 border-red-300' : 'bg-gray-50 dark:bg-gray-900'
          }`}>
            <p className="text-sm text-muted-foreground mb-3">For cashier to scan:</p>
            
            {!isExpired && (
              <div className="bg-white p-4 rounded-lg inline-block mb-3">
                <QRCode 
                  value={`${window.location.origin}/hawker/validate?mode=payment&code=${paymentResult.paymentCode}`}
                  size={160}
                  level="M"
                />
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mb-2">Or manually enter code:</p>
            <div className={`text-3xl font-mono font-bold tracking-wider mb-2 ${
              isExpired ? 'text-red-500' : 'text-primary'
            }`}>
              {paymentResult.paymentCode}
            </div>
            
            {paymentResult.expiresAt && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={`text-sm font-mono ${isExpired ? 'text-red-500' : ''}`}>
                  {isExpired ? 'EXPIRED' : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
                </span>
              </div>
            )}
            
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Payment PIN Code</p>
            </div>
          </div>

          {/* Amount Display - Prominent */}
          <div className={`p-4 rounded-lg border-2 mb-4 ${
            isCompleted ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800' :
            isValidated ? 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800' :
            'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800'
          }`}>
            <div className="text-center">
              <div className={`text-sm font-medium mb-1 ${
                isCompleted ? 'text-green-700 dark:text-green-300' :
                isValidated && paymentResult.finalAmount > 0 ? 'text-blue-700 dark:text-blue-300' :
                'text-gray-700 dark:text-gray-300'
              }`}>
                {isCompleted ? 'PAYMENT COMPLETED' :
                 isValidated && paymentResult.finalAmount === 0 ? 'FREE PURCHASE' :
                 isValidated ? 'CASH COLLECTION' : 
                 'MERCHANT COLLECTS'}
              </div>
              <div className={`text-3xl font-bold ${
                isCompleted ? 'text-green-600 dark:text-green-400' :
                isValidated && paymentResult.finalAmount > 0 ? 'text-blue-600 dark:text-blue-400' :
                isValidated && paymentResult.finalAmount === 0 ? 'text-green-600 dark:text-green-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {paymentResult.finalAmount === 0 ? 'FREE!' : `₹${paymentResult.finalAmount.toFixed(2)}`}
              </div>
              <div className={`text-xs mt-1 ${
                isCompleted ? 'text-green-600 dark:text-green-400' :
                isValidated ? 'text-blue-600 dark:text-blue-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {isValidated && paymentResult.finalAmount === 0 ? 'Credits covered full amount' :
                 isValidated ? 'Amount to collect in cash' :
                 paymentResult.finalAmount === 0 ? 'Fully covered by credits' : 
                 'After credits & discounts'}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Customer Bill:</span>
              <span className="font-medium">₹{paymentResult.billAmount.toFixed(2)}</span>
            </div>
            
            {paymentResult.directDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="text-sm">Deal Discount:</span>
                <span className="font-medium">-₹{paymentResult.directDiscount.toFixed(2)}</span>
              </div>
            )}
            
            {paymentResult.creditsUsed > 0 && (
              <div className="flex justify-between text-blue-600">
                <span className="text-sm">Credits Applied:</span>
                <span className="font-medium">-₹{paymentResult.creditsUsed.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Customer Pays:</span>
                <span className={paymentResult.isFullyCovered ? "text-green-600" : ""}>
                  {paymentResult.isFullyCovered ? "FREE!" : `₹${paymentResult.finalAmount.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Savings Highlight */}
          {paymentResult.totalSavings > 0 && (
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <Gift className="w-4 h-4" />
                <span className="font-medium">
                  You Saved ₹{paymentResult.totalSavings.toFixed(2)}!
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions for Customer */}
      <Card className={isExpired ? "border-red-200 bg-red-50 dark:bg-red-950/20" : ""}>
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3">
            {isExpired ? "Code Expired" : "Next Steps:"}
          </h3>
          
          {isExpired ? (
            <div className="text-sm text-red-600 dark:text-red-400 space-y-2">
              <p>This payment code has expired. Please generate a new one to complete your purchase.</p>
              <Button onClick={onBack} variant="outline" size="sm" className="w-full mt-3">
                Generate New Code
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <span>
                  {paymentResult.isFullyCovered 
                    ? "Complete your purchase - it's FREE!" 
                    : `Pay ₹${paymentResult.finalAmount.toFixed(2)} at the counter first`
                  }
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <span>Show this QR code to the cashier for scanning</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <span>Cashback credits are applied automatically to your account</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deal Info */}
      <Card className="bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">
              {paymentResult.dealTitle}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              at {paymentResult.merchantName}
            </p>
          </div>
        </CardContent>
      </Card>


      {/* Demo Mode Controls - Only show scan button when pending */}
      {isDemoMode && transactionStatus === 'pending' && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
                Demo: Simulate merchant scan
              </p>
              <Button 
                onClick={simulateScan}
                variant="outline" 
                size="sm" 
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Simulate Merchant Scan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack} variant="outline" className="w-full">
        ← Edit Bill Amount
      </Button>
    </div>
  );
}