import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle, CreditCard, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MerchantPaymentCodeProps {
  paymentResult: {
    paymentCode: string;
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
          {/* Large Payment Code */}
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed">
            <p className="text-sm text-muted-foreground mb-2">Show this code to cashier</p>
            <div className="text-4xl font-mono font-bold tracking-wider text-primary mb-2">
              {paymentResult.paymentCode}
            </div>
            <Button variant="outline" size="sm" onClick={copyCode}>
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
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-3">Next Steps:</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
              <span>Show this code to the cashier</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
              <span>
                {paymentResult.isFullyCovered 
                  ? "Enjoy your free purchase!" 
                  : `Pay ₹${paymentResult.finalAmount.toFixed(2)} using any method`
                }
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
              <span>Wait for cashier to validate and get your receipt</span>
            </div>
          </div>
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
        ← Back to Grab Pass
      </Button>
    </div>
  );
}