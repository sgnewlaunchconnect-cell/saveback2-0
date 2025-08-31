import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, CreditCard, Gift, Clock, QrCode, Loader2, Eye, AlertCircle, Play, CheckCheck, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';

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
  merchantData?: any;
  grabData?: any;
}

export default function MerchantPaymentCode({
  paymentResult,
  onBack,
  merchantData,
  grabData
}: MerchantPaymentCodeProps) {
  const { toast } = useToast();
  const { isDemoMode, mockSupabaseCall } = useDemoMode();
  const [timeLeft, setTimeLeft] = useState(0);
  const [transactionStatus, setTransactionStatus] = useState<'pending' | 'validated' | 'authorized' | 'completed' | 'voided' | 'expired'>('pending');
  const [isPolling, setIsPolling] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Waiting for cashier to scan...');
  
  // Check if demo mode is enabled
  const isActualDemo = new URLSearchParams(window.location.search).get('demo') === '1';

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
        let response;
        if (isDemoMode) {
          response = await mockSupabaseCall('checkPendingStatus', {
            paymentCode: paymentResult.paymentCode
          });
        } else {
          response = await supabase.functions.invoke('checkPendingStatus', {
            body: { paymentCode: paymentResult.paymentCode }
          });
        }
        
        const { data, error } = response;
        if (error) throw error;

        const status = data.data.status;
        setTransactionStatus(status);

        // Update status message
        switch (status) {
          case 'pending':
            setStatusMessage('Waiting for cashier to validate…');
            break;
          case 'validated':
          case 'authorized':
            if (paymentResult.finalAmount === 0) {
              setStatusMessage('Verified — Transaction complete!');
            } else {
              const finalAmount = paymentResult.finalAmount ?? 0;
              setStatusMessage(`Verified — Please pay $${finalAmount.toFixed(2)} to the cashier. Then press Payment Received.`);
            }
            break;
          case 'completed':
            setStatusMessage('Payment confirmed — Transaction complete.');
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
  const isValidated = transactionStatus === 'validated' || transactionStatus === 'authorized';

  // Copy payment code to clipboard
  const copyPaymentCode = async () => {
    try {
      await navigator.clipboard.writeText(paymentResult.paymentCode);
      toast({
        title: "Code Copied!",
        description: "Payment code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy payment code",
        variant: "destructive"
      });
    }
  };


  // Calculate countdown progress for ring animation
  const totalTime = paymentResult.expiresAt 
    ? new Date(paymentResult.expiresAt).getTime() - new Date().getTime() + timeLeft
    : 300000; // 5 minutes default
  const progress = timeLeft / totalTime;

  // Merchant scan and validate functions
  const simulateScan = async () => {
    try {
      let response;
      if (isDemoMode) {
        response = await mockSupabaseCall('validatePendingTransaction', {
          paymentCode: paymentResult.paymentCode,
          merchantId: merchantData?.id || grabData?.merchant_id,
          captureNow: paymentResult.finalAmount === 0
        });
      } else {
        response = await supabase.functions.invoke('validatePendingTransaction', {
          body: { 
            paymentCode: paymentResult.paymentCode,
            merchantId: isActualDemo ? null : merchantData?.id || grabData?.merchant_id,
            captureNow: paymentResult.finalAmount === 0
          }
        });
      }
      
      const { data, error } = response;
      if (error) throw error;

      // Optimistically update status for free transactions
      if (paymentResult.finalAmount === 0) {
        setTransactionStatus('completed');
        setIsPolling(false);
      } else {
        setTransactionStatus('validated');
      }

      toast({
        title: isActualDemo ? "Demo: Merchant Scanned" : "Merchant Scanned",
        description: paymentResult.finalAmount === 0 
          ? "Free transaction completed!" 
          : "Transaction has been authorized by merchant",
      });
    } catch (error) {
      console.error('Scan error:', error);
      toast({
        title: isActualDemo ? "Demo Error" : "Scan Error",
        description: "Failed to validate transaction",
        variant: "destructive"
      });
    }
  };

  const simulateConfirm = async () => {
    if (!isValidated || paymentResult.finalAmount === 0) return;
    
    try {
      let response;
      if (isDemoMode) {
        response = await mockSupabaseCall('confirmCashCollection', {
          paymentCode: paymentResult.paymentCode,
          merchantId: merchantData?.id || grabData?.merchant_id
        });
      } else {
        response = await supabase.functions.invoke('confirmCashCollection', {
          body: { 
            paymentCode: paymentResult.paymentCode,
            merchantId: isActualDemo ? null : merchantData?.id || grabData?.merchant_id
          }
        });
      }
      
      const { data, error } = response;
      if (error) throw error;

      // Immediately update status after confirmation
      setTransactionStatus('completed');
      setIsPolling(false);

      toast({
        title: isActualDemo ? "Demo: Payment Received" : "Payment Received",
        description: "Cash collection has been confirmed",
      });
    } catch (error) {
      console.error('Confirm error:', error);
      toast({
        title: isActualDemo ? "Demo Error" : "Confirmation Error",
        description: "Failed to confirm payment",
        variant: "destructive"
      });
    }
  };

  // One-click demo flow for scan + confirm
  const simulateScanAndConfirm = async () => {
    if (paymentResult.finalAmount === 0) {
      // For free transactions, just run scan
      await simulateScan();
      return;
    }

    try {
      // First scan/validate
      const { data: scanData, error: scanError } = await supabase.functions.invoke('validatePendingTransaction', {
        body: { 
          paymentCode: paymentResult.paymentCode,
          merchantId: null,
          captureNow: false
        }
      });

      if (scanError) throw scanError;

      // Update to validated state
      setTransactionStatus('validated');

      // Then immediately confirm
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirmCashCollection', {
        body: { 
          paymentCode: paymentResult.paymentCode,
          merchantId: null
        }
      });

      if (confirmError) throw confirmError;

      // Final completion
      setTransactionStatus('completed');
      setIsPolling(false);

      toast({
        title: "Demo: Scan + Confirm Complete",
        description: "Transaction completed in one step",
      });
    } catch (error) {
      console.error('One-click demo error:', error);
      toast({
        title: "Demo Error",
        description: "Failed to complete one-click demo",
        variant: "destructive"
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Compact Header with Status and Countdown */}
      <div className="flex items-center justify-between bg-card rounded-lg p-4 border">
        <div className="flex items-center gap-3">
          <Badge 
            variant={
              isCompleted ? "default" :
              isVoided ? "destructive" :
              isExpired ? "secondary" :
              isValidated ? "outline" :
              "secondary"
            }
            className={`${
              isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              isVoided ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
              isExpired ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
              isValidated ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
            }`}
          >
            {isPolling && !isCompleted && !isVoided && !isExpired && (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            )}
            {isCompleted && <CheckCircle className="h-3 w-3 mr-1" />}
            {isVoided && <AlertCircle className="h-3 w-3 mr-1" />}
            {isExpired && <Clock className="h-3 w-3 mr-1" />}
            {isValidated && <Eye className="h-3 w-3 mr-1" />}
            <span className="text-xs font-medium">
              {isCompleted ? 'Completed' :
               isVoided ? 'Cancelled' :
               isExpired ? 'Expired' :
             isValidated ? 'Verified' :
             'Pending'}
           </span>
         </Badge>
         <span 
           className="text-sm text-muted-foreground"
           aria-live="polite"
         >
           {isCompleted ? 'Payment confirmed' :
            isVoided ? 'Transaction cancelled' :
            isExpired ? 'Code expired' :
            isValidated ? (paymentResult.finalAmount === 0 ? 'Free purchase' : 'Pay in cash') :
            'Waiting for cashier to validate…'}
         </span>
        </div>
        
        {paymentResult.expiresAt && !isExpired && !isCompleted && (
          <div className="flex items-center gap-2 text-sm font-mono">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className={timeLeft < 60000 ? 'text-red-500' : 'text-muted-foreground'}>
              {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Merchant & Deal Context */}
      <div className="text-center text-sm text-muted-foreground">
        <span className="font-medium">{paymentResult.dealTitle}</span>
        <span className="mx-2">at</span>
        <span>{paymentResult.merchantName}</span>
      </div>

      {/* Large Amount Display */}
      <Card className={`text-center ${
        isCompleted ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200' :
        isValidated ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200' :
        'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20'
      }`}>
        <CardContent className="py-8">
          <div className="space-y-2">
            <p className={`text-sm font-medium ${
              isCompleted ? 'text-green-700 dark:text-green-300' :
              isValidated ? 'text-blue-700 dark:text-blue-300' :
              'text-muted-foreground'
            }`}>
              Customer Pays
            </p>
            <div className={`text-5xl font-bold ${
              paymentResult.finalAmount === 0 ? 'text-green-600 dark:text-green-400' :
              isCompleted ? 'text-green-600 dark:text-green-400' :
              isValidated ? 'text-blue-600 dark:text-blue-400' :
              'text-foreground'
            }`}>
              {paymentResult.finalAmount === 0 
                ? 'FREE!' 
                : paymentResult.finalAmount !== null && paymentResult.finalAmount !== undefined
                  ? `$${paymentResult.finalAmount.toFixed(2)}`
                  : 'TBD'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentResult.finalAmount === 0 
                ? 'Fully covered by credits' 
                : paymentResult.finalAmount !== null && paymentResult.finalAmount !== undefined
                  ? 'After credits & discounts'
                  : 'Merchant will enter the amount'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Demo Mode Banner */}
      {isActualDemo && (
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Play className="w-4 h-4" />
              <span className="font-medium">Demo Mode Active</span>
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
              Add ?demo=1 to URL. Use "Demo: Merchant Scan" then "Demo: Payment Received", or use "Demo: Scan + Confirm" for one-click completion.
            </p>
          </CardContent>
        </Card>
      )}

      {/* QR Code Panel or Success View */}
      {isCompleted ? (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-700 dark:text-green-300 mb-2">
              Payment Complete!
            </h3>
            <p className="text-green-600 dark:text-green-400 mb-4">
              Your transaction has been successfully processed.
            </p>
            <div className="bg-white/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-700">
                Amount Paid: <span className="font-bold">
                  {paymentResult.finalAmount !== null && paymentResult.finalAmount !== undefined
                    ? `$${paymentResult.finalAmount.toFixed(2)}`
                    : '$0.00'
                  }
                </span>
              </p>
              {(paymentResult.totalSavings || 0) > 0 && (
                <p className="text-sm text-green-700">
                  Total Savings: <span className="font-bold">${((paymentResult.totalSavings || 0).toFixed(2))}</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* QR Code with Countdown Ring */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Show this code to the cashier for validation. They will validate and {paymentResult.finalAmount > 0 ? 'then confirm cash collection.' : 'complete the transaction.'}
                </p>
              
              {!isExpired && (
                <div className="relative inline-block">
                  {/* Countdown ring */}
                  <svg 
                    className="absolute inset-0 w-full h-full -rotate-90" 
                    style={{ width: '200px', height: '200px' }}
                  >
                    <circle
                      cx="100"
                      cy="100"
                      r="96"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="96"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 96}`}
                      strokeDashoffset={`${2 * Math.PI * 96 * (1 - progress)}`}
                      className={`transition-all duration-1000 ${
                        timeLeft < 60000 ? 'text-red-500' : 'text-blue-500'
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-xl shadow-sm relative z-10 m-4">
                    <QRCode 
                      value={`${window.location.origin}/hawker/validate?mode=payment&code=${paymentResult.paymentCode}`}
                      size={168}
                      level="M"
                    />
                  </div>
                </div>
              )}
              
              {isExpired && (
                <div className="bg-red-50 dark:bg-red-950/20 p-8 rounded-xl border-2 border-dashed border-red-300">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                  <p className="text-red-600 dark:text-red-400 font-medium">QR Code Expired</p>
                </div>
              )}
            </div>

            {/* Manual Code with Copy Button */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Or manually enter code</p>
              
              <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
                <div className="flex-1 text-center">
                  <div className={`text-2xl font-mono font-bold tracking-widest ${
                    isExpired ? 'text-red-500' : 'text-foreground'
                  }`}>
                    {paymentResult.paymentCode.match(/.{1,4}/g)?.join(' ') || paymentResult.paymentCode}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Payment Code</p>
                </div>
                
                <Button
                  onClick={copyPaymentCode}
                  variant="outline"
                  size="sm"
                  disabled={isExpired ? true : false}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Merchant Actions */}
            <div className="space-y-2">
              {transactionStatus === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    onClick={simulateScan}
                    variant="outline" 
                    size="sm"
                    className={`flex-1 ${isActualDemo 
                      ? 'border-purple-300 text-purple-700 hover:bg-purple-100' 
                      : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isActualDemo ? 'Demo: ' : ''}Merchant Scan
                  </Button>
                  
                  {isActualDemo && paymentResult.finalAmount > 0 && (
                    <Button 
                      onClick={simulateScanAndConfirm}
                      variant="outline" 
                      size="sm"
                      className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-100"
                    >
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Demo: Scan + Confirm
                    </Button>
                  )}
                </div>
              )}
              
              {isValidated && paymentResult.finalAmount > 0 && (
                <Button 
                  onClick={simulateConfirm}
                  variant="outline" 
                  size="sm"
                  className={`w-full ${isActualDemo 
                    ? 'border-purple-300 text-purple-700 hover:bg-purple-100' 
                    : 'border-green-300 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {isActualDemo ? 'Demo: ' : ''}Payment Received
                </Button>
              )}
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <h3 className="font-medium text-sm mb-3">Payment Summary</h3>
            
            <div className="flex justify-between">
              <span className="text-sm">Customer Bill:</span>
              <span className="font-medium">
                {paymentResult.billAmount !== null && paymentResult.billAmount !== undefined 
                  ? `$${paymentResult.billAmount.toFixed(2)}`
                  : 'TBD (merchant will enter)'
                }
              </span>
            </div>
            
            {(paymentResult.directDiscount || 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span className="text-sm">Deal Discount:</span>
                <span className="font-medium">-${((paymentResult.directDiscount || 0).toFixed(2))}</span>
              </div>
            )}
            
            {(paymentResult.creditsUsed || 0) > 0 && (
              <div className="flex justify-between text-blue-600">
                <span className="text-sm">Credits Applied:</span>
                <span className="font-medium">-${((paymentResult.creditsUsed || 0).toFixed(2))}</span>
              </div>
            )}
            
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Final Amount:</span>
                <span className={paymentResult.isFullyCovered ? "text-green-600" : ""}>
                  {paymentResult.isFullyCovered 
                    ? "FREE!" 
                    : paymentResult.finalAmount !== null && paymentResult.finalAmount !== undefined
                      ? `$${paymentResult.finalAmount.toFixed(2)}`
                      : "TBD (merchant will enter)"
                  }
                </span>
              </div>
            </div>

            {/* Savings Highlight */}
            {(paymentResult.totalSavings || 0) > 0 && (
              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800 text-center mt-4">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <Gift className="w-4 h-4" />
                  <span className="font-medium">
                    You Saved ${((paymentResult.totalSavings || 0).toFixed(2))}!
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions or Actions */}
      {isExpired ? (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="font-medium text-red-700 dark:text-red-300 mb-2">Code Expired</h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              This payment code has expired. Generate a new one to complete your purchase.
            </p>
            <Button onClick={onBack} variant="outline" size="sm" className="w-full">
              Generate New Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-3">Next Steps</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                <span>
                  {paymentResult.isFullyCovered 
                    ? "Complete your purchase - it's FREE!" 
                    : paymentResult.finalAmount !== null && paymentResult.finalAmount !== undefined
                      ? `Pay $${paymentResult.finalAmount.toFixed(2)} at the counter first`
                      : "Merchant will enter the amount and process payment"
                  }
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                <span>Show this QR code to the cashier for scanning</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                <span>Cashback credits are applied automatically to your account</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Mode Controls - Only show if actual demo mode */}
      {isActualDemo && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">Demo Mode Active</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Merchant scan and validate actions are available above.
            </p>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack} variant="outline" className="w-full">
        ← Edit Bill Amount
      </Button>
    </div>
  );
}