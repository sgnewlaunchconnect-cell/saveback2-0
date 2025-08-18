import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PaymentFlow from '@/components/PaymentFlow';

export default function PaymentDemo() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('15.99');
  
  // Demo credit balances
  const localCredits = 850; // $8.50
  const networkCredits = 450; // $4.50

  const handlePaymentComplete = (paymentDetails: any) => {
    // In a real app, this would update the user's credit balances
    console.log('Payment completed:', paymentDetails);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Payment Demo</h1>
            <p className="text-sm text-muted-foreground">
              Test the credit payment system
            </p>
          </div>
        </div>

        {/* Amount Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Available credits: ${((localCredits + networkCredits) / 100).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        {/* Payment Flow */}
        <PaymentFlow
          originalAmount={Math.round(parseFloat(amount || '0') * 100)}
          localCredits={localCredits}
          networkCredits={networkCredits}
          onPaymentComplete={handlePaymentComplete}
          autoApplyCredits={false}
        />

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How Credit Priority Works
            </h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Local credits are applied first (merchant-specific)</li>
              <li>2. Network credits fill the remaining balance</li>
              <li>3. Any leftover amount is charged to your payment method</li>
              <li>4. You earn new credits on the final paid amount!</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}