import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ProofOfPaymentQRProps {
  paymentIntentId: string;
  merchantName: string;
  amount: number;
  timestamp: string;
  onContinue: () => void;
}

export default function ProofOfPaymentQR({
  paymentIntentId,
  merchantName,
  amount,
  timestamp,
  onContinue
}: ProofOfPaymentQRProps) {
  // Create verification URL
  const verificationUrl = `${window.location.origin}/verify-payment?paymentId=${paymentIntentId}`;


  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">
            Payment Successful!
          </h2>
          <p className="text-green-700 dark:text-green-400">
            Your in-app payment has been processed successfully
          </p>
        </CardContent>
      </Card>

      {/* QR Code for Merchant Verification */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            <QrCode className="w-5 h-5" />
            Proof of Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border">
              <QRCodeSVG 
                value={verificationUrl}
                size={200}
                level="M"
                includeMargin
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Merchant scans this QR to view proof (optional) — payment is already completed
            </p>
            <Badge variant="secondary" className="text-xs">
              Auto-validated • No scanning required
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Merchant:</span>
            <span className="font-medium">{merchantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid:</span>
            <span className="font-medium">₹{(amount / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transaction ID:</span>
            <span className="font-mono text-sm">{paymentIntentId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date & Time:</span>
            <span className="text-sm">{timestamp}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onContinue} variant="cta" className="w-full" size="lg">
        Continue Shopping
      </Button>
    </div>
  );
}