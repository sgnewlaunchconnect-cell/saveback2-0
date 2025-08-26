import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Scan } from 'lucide-react';

interface MerchantCollectCashSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MerchantCollectCashSimulator: React.FC<MerchantCollectCashSimulatorProps> = ({
  open,
  onOpenChange
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentCode, setPaymentCode] = useState('');

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPaymentCode(value);
  };

  const handleContinue = () => {
    if (paymentCode.length === 6) {
      setCurrentStep(2);
    }
  };

  const handleConfirmCash = () => {
    setCurrentStep(3);
  };

  const resetSimulator = () => {
    setCurrentStep(1);
    setPaymentCode('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetSimulator();
  };

  const simulateCodeScan = () => {
    setPaymentCode('123456');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Cash Flow Preview</DialogTitle>
          <DialogDescription>
            A step-by-step preview of the collect cash flow.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : step < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Enter Payment Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={paymentCode}
                  onChange={handleCodeInput}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={simulateCodeScan}
                  className="flex-1"
                >
                  <Scan className="w-4 h-4 mr-2" />
                  Simulate Scan
                </Button>
              </div>

              <Button 
                onClick={handleContinue}
                disabled={paymentCode.length !== 6}
                className="w-full"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Payment Authorized</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  AWAITING CASH COLLECTION
                </Badge>
                <div className="text-2xl font-bold">₹25.00</div>
                <div className="text-sm text-muted-foreground">
                  Code: {paymentCode}
                </div>
              </div>

              <Button 
                onClick={handleConfirmCash}
                className="w-full"
              >
                Confirm Cash Received
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Payment Completed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  COMPLETED
                </Badge>
                <div className="text-2xl font-bold text-green-600">₹25.00</div>
                <div className="text-sm text-muted-foreground">
                  Payment successfully processed
                </div>
                <div className="text-xs text-muted-foreground">
                  Credits awarded to customer
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetSimulator} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};