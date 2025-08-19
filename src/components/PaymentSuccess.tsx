import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Gift, CreditCard, QrCode } from "lucide-react";

interface PaymentSuccessProps {
  paymentCode: string;
  totalSavings: number;
  originalAmount: number;
  finalAmount: number;
  creditsUsed: number;
  directDiscountAmount?: number;
  onContinue: () => void;
}

export default function PaymentSuccess({
  paymentCode,
  totalSavings,
  originalAmount,
  finalAmount,
  creditsUsed,
  directDiscountAmount = 0,
  onContinue
}: PaymentSuccessProps) {
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Payment Complete!</h2>
          <p className="text-green-700">
            Your grab pass has been activated successfully
          </p>
        </CardContent>
      </Card>

      {/* Payment Code */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            <QrCode className="w-5 h-5" />
            Payment Confirmation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-3xl font-mono font-bold text-primary mb-2 tracking-wider">
            {paymentCode}
          </div>
          <p className="text-sm text-muted-foreground">
            Show this code to the merchant if needed
          </p>
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Amount Paid - Large Display */}
          <div className="text-center bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
            <p className="text-3xl font-bold text-primary">₹{finalAmount.toFixed(2)}</p>
          </div>
          
          {/* Breakdown */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bill Amount:</span>
              <span>₹{originalAmount.toFixed(2)}</span>
            </div>
            
            {directDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Direct Discount:</span>
                <span>-₹{directDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            
            {creditsUsed > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Credits Applied:</span>
                <span>-₹{creditsUsed.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t pt-2 flex justify-between items-center font-medium">
              <span>Net Paid:</span>
              <span>₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>
          
          {totalSavings > 0 && (
            <div className="text-center pt-3">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <Gift className="w-5 h-5" />
                  <span className="font-semibold text-lg">
                    Total Saved: ₹{totalSavings.toFixed(2)}!
                  </span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Great job saving money! 🎉
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            What's Next?
          </h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Your grab pass is now marked as used</li>
            <li>• Credits have been applied to your purchase</li>
            <li>• Enjoy your savings and visit again soon!</li>
          </ul>
        </CardContent>
      </Card>

      <Button onClick={onContinue} variant="cta" className="w-full" size="lg">
        Continue
      </Button>
    </div>
  );
}