import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, Settings, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PaymentFlow from '@/components/PaymentFlow';

export default function PaymentDemo() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('15.99');
  const [autoApplyCredits, setAutoApplyCredits] = useState(true); // Default to ON for demo
  
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
            <h1 className="text-xl font-bold">Credit Payment Demo</h1>
            <p className="text-sm text-muted-foreground">
              See auto-apply credits in action
            </p>
          </div>
        </div>

        {/* Demo Settings */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Settings className="h-5 w-5" />
              Demo Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-blue-800 dark:text-blue-200">Auto-apply credits</Label>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Simulate user's preference setting
                </p>
              </div>
              <Switch
                checked={autoApplyCredits}
                onCheckedChange={setAutoApplyCredits}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-white/50 rounded">
                <p className="text-xs text-blue-700 dark:text-blue-300">Local Credits</p>
                <Badge variant="secondary">${(localCredits / 100).toFixed(2)}</Badge>
              </div>
              <div className="text-center p-2 bg-white/50 rounded">
                <p className="text-xs text-blue-700 dark:text-blue-300">Network Credits</p>
                <Badge variant="outline">${(networkCredits / 100).toFixed(2)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

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
            
            {/* Quick amount buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAmount('5.99')}
              >
                $5.99
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAmount('12.99')}
              >
                $12.99
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAmount('25.00')}
              >
                $25.00
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Flow */}
        <PaymentFlow
          originalAmount={Math.round(parseFloat(amount || '0') * 100)}
          localCredits={localCredits}
          networkCredits={networkCredits}
          onPaymentComplete={handlePaymentComplete}
          autoApplyCredits={autoApplyCredits}
        />

        {/* Demo Flow Explanation */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {autoApplyCredits ? "Auto-Apply Credits: ON" : "Auto-Apply Credits: OFF"}
            </h3>
            
            {autoApplyCredits ? (
              <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
                <p>✅ Credits are automatically applied at checkout</p>
                <p>✅ Local credits used first for better rewards</p>
                <p>✅ Network credits cover remaining balance</p>
                <p>✅ User sees instant savings without extra steps</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <p>⚪ User can manually toggle credit usage</p>
                <p>⚪ Credits available but require user action</p>
                <p>⚪ Good for users who want control</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Motivates */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-4">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              🎯 How This Motivates Credit Accumulation:
            </h3>
            <ol className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
              <li>1. <strong>Instant gratification</strong> - See savings immediately</li>
              <li>2. <strong>Smart defaults</strong> - Local credits used first for better rewards</li>
              <li>3. <strong>Free purchases</strong> - Credits can cover entire transactions</li>
              <li>4. <strong>New credits earned</strong> - 2% local + 1% network on remaining balance</li>
              <li>5. <strong>Progress tracking</strong> - Visual goals encourage more earning</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}