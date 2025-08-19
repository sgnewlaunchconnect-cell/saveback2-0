import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, QrCode, CreditCard } from 'lucide-react';

interface PaymentInstructionsProps {
  finalAmount: number;
  localCreditsUsed: number;
  networkCreditsUsed: number;
  merchantName: string;
  paymentCode: string;
  isInAppPayment?: boolean;
}

export const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({
  finalAmount,
  localCreditsUsed,
  networkCreditsUsed,
  merchantName,
  paymentCode,
  isInAppPayment = false
}) => {
  const totalCreditsUsed = localCreditsUsed + networkCreditsUsed;
  const needsPayment = finalAmount > 0;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {isInAppPayment ? <CreditCard className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
          Payment Instructions
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Credit Summary */}
        {totalCreditsUsed > 0 && (
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Credits Applied</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              {localCreditsUsed > 0 && (
                <div>Local Credits: ${localCreditsUsed.toFixed(2)}</div>
              )}
              {networkCreditsUsed > 0 && (
                <div>Network Credits: ${networkCreditsUsed.toFixed(2)}</div>
              )}
              <div className="font-medium">Total Saved: ${totalCreditsUsed.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Payment Code */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Payment Code</div>
          <div className="text-2xl font-bold tracking-wider">{paymentCode}</div>
        </div>

        {/* Payment Instructions */}
        <div className="space-y-3">
          {needsPayment ? (
            <>
              <div className="text-center">
                <Badge variant="outline" className="text-base px-3 py-1">
                  Amount to Pay: ${finalAmount.toFixed(2)}
                </Badge>
              </div>
              
              {isInAppPayment ? (
                <div className="text-sm text-gray-600 text-center">
                  <p className="mb-2">Complete your payment using the in-app payment system.</p>
                  <p className="font-medium">Show this payment code to the cashier for verification.</p>
                </div>
              ) : (
                <div className="text-sm text-gray-600 text-center">
                  <p className="mb-2">1. Scan the merchant's QR code to pay ${finalAmount.toFixed(2)}</p>
                  <p className="mb-2">2. Show this payment code to the cashier</p>
                  <p className="font-medium">3. Wait for cashier confirmation to receive your cashback</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-2">
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                No Payment Required!
              </Badge>
              <div className="text-sm text-gray-600">
                <p>Your credits covered the full amount.</p>
                <p className="font-medium">Show this code to the cashier for confirmation.</p>
              </div>
            </div>
          )}
        </div>

        {/* Merchant Info */}
        <div className="text-center text-sm text-gray-500 border-t pt-3">
          At: <span className="font-medium">{merchantName}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentInstructions;