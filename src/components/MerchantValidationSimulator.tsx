import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Scan, DollarSign, CreditCard, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface MerchantValidationSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow?: 'flow1' | 'flow2';
  context?: {
    merchantName?: string;
    dealTitle?: string;
    billAmount?: number;
  };
  initialStep?: number;
  initialMerchantAmount?: string;
}

export default function MerchantValidationSimulator({ 
  open, 
  onOpenChange, 
  flow = 'flow1',
  context = {},
  initialStep = 1,
  initialMerchantAmount = ""
}: MerchantValidationSimulatorProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [paymentCode, setPaymentCode] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [merchantAmount, setMerchantAmount] = useState(initialMerchantAmount);
  
  const isFlow2 = flow === 'flow2';
  const { merchantName = "Demo Merchant", dealTitle, billAmount } = context;

  const handleCodeInput = (value: string) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPaymentCode(numericValue);
  };

  const handleValidatePayment = () => {
    if (isFlow2) {
      // Flow 2: Merchant enters amount, validates if > 0
      if (parseFloat(merchantAmount) > 0) {
        setShowResult(true);
        setTimeout(() => {
          setCurrentStep(2);
          setShowResult(false);
        }, 1500);
      }
    } else {
      // Flow 1: Customer enters 6-digit code
      if (paymentCode.length === 6) {
        setShowResult(true);
        setTimeout(() => {
          setCurrentStep(2);
          setShowResult(false);
        }, 1500);
      }
    }
  };

  const handleConfirmCash = () => {
    setShowResult(true);
    setTimeout(() => {
      setCurrentStep(3);
      setShowResult(false);
    }, 1500);
  };

  const resetSimulator = () => {
    setCurrentStep(initialStep);
    setPaymentCode("");
    setShowResult(false);
    setMerchantAmount(initialMerchantAmount);
  };

  // Reset simulator when flow changes or modal reopens
  useEffect(() => {
    resetSimulator();
  }, [flow, open]);

  const handleClose = () => {
    resetSimulator();
    onOpenChange(false);
  };

  const simulateCodeScan = () => {
    setPaymentCode("123456");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isFlow2 ? "QR Payment Demo - Customer Scans Merchant QR" : "Code Payment Demo - Merchant Validates Customer"}
          </DialogTitle>
          <DialogDescription>
            {isFlow2 
              ? "Merchant keys amount, generates QR, customer scans and pays" 
              : "Customer generates code, merchant validates payment"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex justify-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step < currentStep ? "✓" : step}
              </div>
            ))}
          </div>

          {/* Context Info */}
          {dealTitle && (
            <div className="text-center text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
              Deal: {dealTitle}
            </div>
          )}
          {isFlow2 === false && billAmount && (
            <div className="text-center text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 p-2 rounded">
              Customer Amount: ₹{billAmount.toFixed(2)}
            </div>
          )}

          {/* Step 1: Enter Code or Amount */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isFlow2 ? <QrCode className="w-5 h-5" /> : <Scan className="w-5 h-5" />}
                  {isFlow2 ? "Step 1: Generate Payment QR" : "Step 1: Enter Payment Code"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isFlow2 ? (
                  <>
                    <div>
                      <Label htmlFor="merchant-amount">Bill Amount (₹)</Label>
                      <Input
                        id="merchant-amount"
                        type="number"
                        step="0.01"
                        value={merchantAmount}
                        onChange={(e) => setMerchantAmount(e.target.value)}
                        placeholder="25.00"
                        className="text-center text-lg"
                      />
                    </div>
                    <Button
                      onClick={handleValidatePayment}
                      disabled={!merchantAmount || parseFloat(merchantAmount) <= 0}
                      className="w-full"
                    >
                      Generate QR Code
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="payment-code">6-Digit Payment Code</Label>
                      <Input
                        id="payment-code"
                        type="text"
                        value={paymentCode}
                        onChange={(e) => handleCodeInput(e.target.value)}
                        placeholder="123456"
                        className="text-center text-lg font-mono"
                        maxLength={6}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={simulateCodeScan}
                        variant="outline"
                        className="flex-1"
                        size="sm"
                      >
                        <Scan className="w-4 h-4 mr-2" />
                        Simulate Scan
                      </Button>
                      <Button
                        onClick={handleValidatePayment}
                        disabled={paymentCode.length !== 6}
                        className="flex-1"
                      >
                        Validate
                      </Button>
                    </div>
                  </>
                )}

                {showResult && (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-600 font-medium">
                      {isFlow2 ? "QR Generated!" : "Code Validated!"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: QR Display or Payment Processing */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isFlow2 ? <QrCode className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  {isFlow2 ? "Step 2: QR Code Generated" : "Step 2: Payment Authorized"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isFlow2 ? (
                  <div className="text-center space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
                      <QRCodeSVG 
                        value={JSON.stringify({ 
                          amount: merchantAmount, 
                          merchantId: "demo-merchant",
                          type: "payment" 
                        })}
                        size={128}
                        level="M"
                      />
                    </div>
                    <div className="text-xl font-bold">
                      ₹{parseFloat(merchantAmount).toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer scans this QR to pay
                    </p>
                    <Button 
                      onClick={handleConfirmCash}
                      className="w-full"
                      size="lg"
                    >
                      Simulate Customer Scan & Pay
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Badge variant="secondary" className="text-yellow-600 bg-yellow-100">
                      AWAITING CASH COLLECTION
                    </Badge>
                    <div className="text-2xl font-bold">
                      ₹{billAmount?.toFixed(2) ?? "25.00"}
                    </div>
                    <p className="text-muted-foreground">
                      Payment Code: {paymentCode || "123456"}
                    </p>
                    <Button
                      onClick={handleConfirmCash}
                      className="w-full"
                      size="lg"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Confirm Cash Received
                    </Button>
                  </div>
                )}

                {showResult && (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-600 font-medium">
                      {isFlow2 ? "Customer Paid!" : "Cash Confirmed!"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Completed */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Step 3: Payment Completed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <Badge variant="secondary" className="text-green-600 bg-green-100">
                    COMPLETED
                  </Badge>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{isFlow2 && merchantAmount ? parseFloat(merchantAmount).toFixed(2) : (billAmount?.toFixed(2) ?? "25.00")}
                  </div>
                  <p className="text-muted-foreground">
                    {isFlow2 ? "Customer scanned QR and paid successfully!" : "Transaction completed successfully!"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Credits have been awarded to both customer and merchant.
                  </p>
                  {isFlow2 && (
                    <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                      In Flow 2, merchant generates QR and customer scans to pay via app.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={resetSimulator} variant="outline" className="flex-1">
                    Try Again
                  </Button>
                  <Button onClick={handleClose} className="flex-1">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}