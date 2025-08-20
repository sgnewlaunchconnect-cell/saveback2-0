import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, CreditCard, Gift, Clock, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';

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
  };
  onBack: () => void;
}

export default function MerchantPaymentCode({
  paymentResult,
  onBack
}: MerchantPaymentCodeProps) {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (paymentResult.expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(paymentResult.expiresAt!).getTime();
        const remaining = Math.max(0, expiry - now);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentResult.expiresAt]);

  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  const isExpired = timeLeft === 0 && paymentResult.expiresAt;

  const copyCode = () => {
    navigator.clipboard.writeText(paymentResult.paymentCode);
    toast({
      title: "Code Copied!",
      description: "Payment code copied to clipboard",
    });
  };

  return (
    <div className="space-y-4">
      {/* Payment Code Display */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Payment Code Ready
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
                <QRCodeSVG 
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
            
            <Button variant="outline" size="sm" onClick={copyCode} disabled={!!isExpired}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </Button>
          </div>

          {/* Payment Summary */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Original Bill:</span>
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
                <span>Amount to Pay:</span>
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
                <span>Cashier scans QR code to validate your payment</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <span>
                  {paymentResult.isFullyCovered 
                    ? "No payment needed - purchase is FREE!" 
                    : `Pay ₹${paymentResult.finalAmount.toFixed(2)} using the merchant's payment system`
                  }
                </span>
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

      <Button onClick={onBack} variant="outline" className="w-full">
        ← Edit Bill Amount
      </Button>
    </div>
  );
}