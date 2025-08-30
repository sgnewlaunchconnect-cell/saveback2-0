import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QrCode, Smartphone, CheckCircle, Clock, User, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DemoState {
  step: 'enter-amount' | 'code-generated' | 'merchant-scanned' | 'payment-received' | 'completed';
  amount: string;
  paymentCode: string;
  customerCreditsEarned: number;
  merchantAmount: number;
  availableLocalCredits: number;
  availableNetworkCredits: number;
  usedLocalCredits: number;
  usedNetworkCredits: number;
  balanceToPay: number;
}

export default function DemoDualScreens() {
  const { toast } = useToast();
  const [demoState, setDemoState] = useState<DemoState>({
    step: 'enter-amount',
    amount: '',
    paymentCode: '',
    customerCreditsEarned: 0,
    merchantAmount: 0,
    availableLocalCredits: 800, // $8.00 in cents
    availableNetworkCredits: 1200, // $12.00 in cents  
    usedLocalCredits: 0,
    usedNetworkCredits: 0,
    balanceToPay: 0
  });

  const generatePaymentCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const amount = parseFloat(demoState.amount);
    const creditsEarned = Math.floor(amount * 0.05); // 5% cashback

    setDemoState(prev => ({
      ...prev,
      step: 'code-generated',
      paymentCode: code,
      customerCreditsEarned: creditsEarned,
      merchantAmount: amount
    }));

    toast({
      title: "Payment Code Generated",
      description: `Code: ${code}`,
    });
  };

  const computeCreditsBreakdown = (amountCents: number, localCents: number, networkCents: number) => {
    let remainingAmount = amountCents;
    
    // Apply local credits first
    const usedLocal = Math.min(localCents, remainingAmount);
    remainingAmount -= usedLocal;
    
    // Apply network credits next
    const usedNetwork = Math.min(networkCents, remainingAmount);
    remainingAmount -= usedNetwork;
    
    return {
      usedLocalCredits: usedLocal,
      usedNetworkCredits: usedNetwork,
      balanceToPay: remainingAmount
    };
  };

  const handleMerchantScan = () => {
    const amountCents = Math.round(parseFloat(demoState.amount) * 100);
    const breakdown = computeCreditsBreakdown(
      amountCents, 
      demoState.availableLocalCredits, 
      demoState.availableNetworkCredits
    );

    setDemoState(prev => ({
      ...prev,
      step: 'merchant-scanned',
      ...breakdown
    }));

    toast({
      title: "Merchant Scanned",
      description: "Payment details verified",
    });
  };

  const handlePaymentReceived = () => {
    setDemoState(prev => ({
      ...prev,
      step: 'payment-received'
    }));

    // Simulate processing delay
    setTimeout(() => {
      setDemoState(prev => ({
        ...prev,
        step: 'completed'
      }));

      toast({
        title: "Payment Completed",
        description: `$${demoState.customerCreditsEarned} credits earned!`,
      });
    }, 1500);
  };

  const resetDemo = () => {
    setDemoState({
      step: 'enter-amount',
      amount: '',
      paymentCode: '',
      customerCreditsEarned: 0,
      merchantAmount: 0,
      availableLocalCredits: 800,
      availableNetworkCredits: 1200,
      usedLocalCredits: 0,
      usedNetworkCredits: 0,
      balanceToPay: 0
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Split Screen Demo: Customer & Merchant Payment Flow
          </h1>
          <p className="text-muted-foreground mt-2">
            Watch how the payment flows between customer and merchant screens
          </p>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center mt-6 mb-4">
            <div className="flex items-center space-x-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                demoState.step === 'enter-amount' ? 'bg-primary text-primary-foreground' : 
                ['code-generated', 'merchant-scanned', 'payment-received', 'completed'].includes(demoState.step) ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <span className={`text-sm ${demoState.step === 'enter-amount' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Enter Amount
              </span>
              
              <div className={`w-12 h-0.5 ${
                ['code-generated', 'merchant-scanned', 'payment-received', 'completed'].includes(demoState.step) ? 'bg-green-500' : 'bg-muted'
              }`} />
              
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                demoState.step === 'code-generated' ? 'bg-primary text-primary-foreground' : 
                ['merchant-scanned', 'payment-received', 'completed'].includes(demoState.step) ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <span className={`text-sm ${demoState.step === 'code-generated' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Show Code
              </span>
              
              <div className={`w-12 h-0.5 ${
                ['merchant-scanned', 'payment-received', 'completed'].includes(demoState.step) ? 'bg-green-500' : 'bg-muted'
              }`} />
              
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                demoState.step === 'merchant-scanned' ? 'bg-primary text-primary-foreground' : 
                ['payment-received', 'completed'].includes(demoState.step) ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
              <span className={`text-sm ${demoState.step === 'merchant-scanned' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Scan Done
              </span>
              
              <div className={`w-12 h-0.5 ${
                ['payment-received', 'completed'].includes(demoState.step) ? 'bg-green-500' : 'bg-muted'
              }`} />
              
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                demoState.step === 'payment-received' ? 'bg-primary text-primary-foreground' : 
                demoState.step === 'completed' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                4
              </div>
              <span className={`text-sm ${demoState.step === 'payment-received' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                Payment Received
              </span>
              
              <div className={`w-12 h-0.5 ${
                demoState.step === 'completed' ? 'bg-green-500' : 'bg-muted'
              }`} />
              
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                demoState.step === 'completed' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                5
              </div>
              <span className={`text-sm ${demoState.step === 'completed' ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
                Completed
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[80vh]">
          {/* Customer Screen */}
          <Card className="flex flex-col">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Customer Screen
                <Badge variant="outline" className="ml-auto">User View</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {demoState.step === 'enter-amount' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Smartphone className="w-16 h-16 mx-auto text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Enter Payment Amount</h3>
                    <p className="text-muted-foreground">How much would you like to pay?</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Amount ($)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={demoState.amount}
                        onChange={(e) => setDemoState(prev => ({ ...prev, amount: e.target.value }))}
                        className="text-lg"
                      />
                    </div>

                    <Button 
                      onClick={generatePaymentCode}
                      disabled={!demoState.amount || parseFloat(demoState.amount) <= 0}
                      className="w-full"
                      size="lg"
                    >
                      Generate Payment Code
                    </Button>
                  </div>
                </div>
              )}

              {demoState.step === 'code-generated' && (
                <div className="text-center space-y-6">
                  <div>
                    <QrCode className="w-16 h-16 mx-auto text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Show Code to Merchant</h3>
                    <p className="text-muted-foreground">Present this code for payment</p>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-6">
                    <div className="text-4xl font-bold text-center tracking-widest">
                      {demoState.paymentCode}
                    </div>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Payment Code
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Waiting for merchant to scan...
                    </div>
                    
                    <Button 
                      onClick={handleMerchantScan}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      Scan Done (Demo)
                    </Button>
                  </div>
                </div>
              )}

              {demoState.step === 'merchant-scanned' && (
                <div className="text-center space-y-6">
                  <div>
                    <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-4 animate-pulse" />
                    <h3 className="text-xl font-semibold mb-2">Payment Processing</h3>
                    <p className="text-muted-foreground">Merchant is processing your payment...</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Total Bill:</span>
                        <span className="font-medium">${demoState.merchantAmount.toFixed(2)}</span>
                      </div>
                      {demoState.usedLocalCredits > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Local Credits Used:</span>
                          <span>-${(demoState.usedLocalCredits / 100).toFixed(2)}</span>
                        </div>
                      )}
                      {demoState.usedNetworkCredits > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Network Credits Used:</span>
                          <span>-${(demoState.usedNetworkCredits / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Balance to Pay:</span>
                        <span>${(demoState.balanceToPay / 100).toFixed(2)}</span>
                      </div>
                      {demoState.balanceToPay === 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Fully covered by credits
                        </Badge>
                      )}
                      <p className="text-yellow-600 text-sm mt-2">
                        Waiting for confirmation...
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handlePaymentReceived}
                      variant="outline"
                      className="w-full"
                      size="sm"
                    >
                      Simulate Payment Received (Demo)
                    </Button>
                  </div>
                </div>
              )}

              {demoState.step === 'payment-received' && (
                <div className="text-center space-y-6">
                  <div>
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Processing Complete</h3>
                    <p className="text-muted-foreground">Finalizing your transaction...</p>
                  </div>
                </div>
              )}

              {demoState.step === 'completed' && (
                <div className="text-center space-y-6">
                  <div>
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-green-700">Payment Successful!</h3>
                    <p className="text-muted-foreground">Thank you for your purchase</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Amount Paid:</span>
                      <span className="font-medium">${demoState.merchantAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Credits Earned:</span>
                      <span className="font-bold">${demoState.customerCreditsEarned}</span>
                    </div>
                  </div>

                  <Button onClick={resetDemo} variant="outline" className="w-full">
                    Start New Transaction
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Merchant Screen */}
          <Card className="flex flex-col">
            <CardHeader className="bg-orange-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                Merchant Screen
                <Badge variant="outline" className="ml-auto bg-orange-100 text-orange-700">
                  Terminal View
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {(demoState.step === 'enter-amount' || demoState.step === 'code-generated') && (
                <div className="text-center space-y-6">
                  <div>
                    <QrCode className="w-16 h-16 mx-auto text-orange-600 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Ready for Payment</h3>
                    <p className="text-muted-foreground">
                      {demoState.step === 'enter-amount' 
                        ? "Waiting for customer to generate payment code..."
                        : "Scan customer's payment code or enter code manually"
                      }
                    </p>
                  </div>

                  {demoState.step === 'code-generated' && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-orange-800 font-medium">
                          Expected Amount: ${demoState.merchantAmount.toFixed(2)}
                        </p>
                        <p className="text-orange-600 text-sm">
                          Code: {demoState.paymentCode}
                        </p>
                      </div>

                      <Button 
                        onClick={handleMerchantScan}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        size="lg"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Scan Done (Demo)
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {demoState.step === 'merchant-scanned' && (
                <div className="text-center space-y-6">
                  <div>
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Payment Verified</h3>
                    <p className="text-muted-foreground">Review payment breakdown</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Total Bill:</span>
                      <span className="font-medium">${demoState.merchantAmount.toFixed(2)}</span>
                    </div>
                    {demoState.usedLocalCredits > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Local Credits Applied:</span>
                        <span>-${(demoState.usedLocalCredits / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {demoState.usedNetworkCredits > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Network Credits Applied:</span>
                        <span>-${(demoState.usedNetworkCredits / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-xl font-bold text-green-700">
                      <span>Balance to Collect:</span>
                      <span>${(demoState.balanceToPay / 100).toFixed(2)}</span>
                    </div>
                    {demoState.balanceToPay === 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-600 mt-2">
                        Fully covered by credits
                      </Badge>
                    )}
                    <div className="text-sm text-muted-foreground mt-2">
                      Payment Code: {demoState.paymentCode}
                    </div>
                  </div>

                  <Button 
                    onClick={handlePaymentReceived}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Payment
                  </Button>
                </div>
              )}

              {(demoState.step === 'payment-received' || demoState.step === 'completed') && (
                <div className="text-center space-y-6">
                  <div>
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-green-700">
                      Transaction Complete
                    </h3>
                    <p className="text-muted-foreground">
                      Payment successfully processed
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-700 mb-2">
                      +${demoState.merchantAmount.toFixed(2)}
                    </div>
                    <p className="text-green-600 text-sm">
                      Added to your account
                    </p>
                  </div>

                  {demoState.step === 'completed' && (
                    <Button onClick={resetDemo} variant="outline" className="w-full">
                      Process Next Payment
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Demo Mode Active - All transactions are simulated
          </div>
        </div>
      </div>
    </div>
  );
}