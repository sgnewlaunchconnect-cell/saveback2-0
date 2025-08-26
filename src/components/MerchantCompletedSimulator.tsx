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
import { CheckCircle, Scan, Award } from 'lucide-react';

interface MerchantCompletedSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MerchantCompletedSimulator: React.FC<MerchantCompletedSimulatorProps> = ({
  open,
  onOpenChange
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentCode, setPaymentCode] = useState('');

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPaymentCode(value);
  };

  const handleViewStatus = () => {
    if (paymentCode.length === 6) {
      setCurrentStep(2);
    }
  };

  const handleViewCredits = () => {
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
          <DialogTitle>Completed Flow Preview</DialogTitle>
          <DialogDescription>
            A step-by-step preview of a completed payment view.
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
                onClick={handleViewStatus}
                disabled={paymentCode.length !== 6}
                className="w-full"
              >
                View Status
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
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
                  Code: {paymentCode}
                </div>
                <div className="text-sm text-green-600">
                  ✓ Payment successfully processed
                </div>
              </div>

              <Button 
                onClick={handleViewCredits}
                className="w-full"
              >
                <Award className="w-4 h-4 mr-2" />
                View Credit Awards
              </Button>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Credits & Rewards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="text-center">
                  <Award className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                  <div className="text-lg font-semibold">Credits Awarded!</div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Customer Cashback:</span>
                    <span className="font-medium">₹2.50 (10%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Merchant Credit:</span>
                    <span className="font-medium">₹1.25 (5%)</span>
                  </div>
                </div>

                <div className="text-xs text-center text-muted-foreground">
                  Transaction completed successfully
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