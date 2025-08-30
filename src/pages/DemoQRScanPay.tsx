import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrencyDisplay } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Smartphone, CheckCircle, CreditCard } from "lucide-react";

type DemoStep = 'merchant-enter' | 'qr-generated' | 'customer-select' | 'processing' | 'complete';

interface DemoState {
  step: DemoStep;
  amount: string;
  txId: string;
  qrPayload: string;
  availableLocalCents: number;
  availableNetworkCents: number;
  applyCredits: boolean;
  selectedLocalCents: number;
  selectedNetworkCents: number;
  balanceCents: number;
  creditsEarnedDisplay: number;
}

const DemoQRScanPay = () => {
  const { toast } = useToast();
  
  const [state, setState] = useState<DemoState>({
    step: 'merchant-enter',
    amount: '',
    txId: '',
    qrPayload: '',
    availableLocalCents: 800, // $8.00
    availableNetworkCents: 1200, // $12.00
    applyCredits: true,
    selectedLocalCents: 0,
    selectedNetworkCents: 0,
    balanceCents: 0,
    creditsEarnedDisplay: 0
  });

  const amountCents = Math.round(parseFloat(state.amount) * 100) || 0;

  // Auto-calculate max credits when amount changes
  useEffect(() => {
    if (state.step === 'customer-select' && state.applyCredits) {
      const maxLocal = Math.min(state.availableLocalCents, amountCents);
      const maxNetwork = Math.min(state.availableNetworkCents, amountCents - maxLocal);
      
      setState(prev => ({
        ...prev,
        selectedLocalCents: maxLocal,
        selectedNetworkCents: maxNetwork,
        balanceCents: amountCents - maxLocal - maxNetwork
      }));
    }
  }, [state.step, state.applyCredits, amountCents]);

  // Update balance when credits change
  useEffect(() => {
    const totalCredits = state.selectedLocalCents + state.selectedNetworkCents;
    setState(prev => ({
      ...prev,
      balanceCents: Math.max(0, amountCents - totalCredits)
    }));
  }, [state.selectedLocalCents, state.selectedNetworkCents, amountCents]);

  const handleRequestPayment = () => {
    if (!state.amount || parseFloat(state.amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    const txId = Math.random().toString(36).substring(2, 15);
    const qrPayload = JSON.stringify({ amount: state.amount, txId });
    
    setState(prev => ({
      ...prev,
      step: 'qr-generated',
      txId,
      qrPayload,
      creditsEarnedDisplay: Math.floor(parseFloat(state.amount) * 0.05)
    }));
    
    toast({ title: "Payment QR Generated", description: `Amount: ${formatCurrencyDisplay(amountCents)}` });
  };

  const handleSimulateScan = () => {
    const maxLocal = Math.min(state.availableLocalCents, amountCents);
    const maxNetwork = Math.min(state.availableNetworkCents, amountCents - maxLocal);
    
    setState(prev => ({
      ...prev,
      step: 'customer-select',
      selectedLocalCents: maxLocal,
      selectedNetworkCents: maxNetwork,
      balanceCents: amountCents - maxLocal - maxNetwork
    }));
    
    toast({ title: "QR Code Scanned", description: "Select your credit usage" });
  };

  const handleConfirmPayment = () => {
    setState(prev => ({ ...prev, step: 'processing' }));
    toast({ title: "Processing Payment...", description: "Please wait" });
    
    setTimeout(() => {
      setState(prev => ({ ...prev, step: 'complete' }));
      toast({ title: "Payment Successful!", description: "Transaction completed" });
    }, 2000);
  };

  const handleReset = () => {
    setState({
      step: 'merchant-enter',
      amount: '',
      txId: '',
      qrPayload: '',
      availableLocalCents: 800,
      availableNetworkCents: 1200,
      applyCredits: true,
      selectedLocalCents: 0,
      selectedNetworkCents: 0,
      balanceCents: 0,
      creditsEarnedDisplay: 0
    });
  };

  const handleToggleCredits = (checked: boolean) => {
    setState(prev => ({
      ...prev,
      applyCredits: checked,
      selectedLocalCents: checked ? Math.min(prev.availableLocalCents, amountCents) : 0,
      selectedNetworkCents: checked ? Math.min(prev.availableNetworkCents, Math.max(0, amountCents - Math.min(prev.availableLocalCents, amountCents))) : 0
    }));
  };

  const handleUseMaxCredits = () => {
    const maxLocal = Math.min(state.availableLocalCents, amountCents);
    const maxNetwork = Math.min(state.availableNetworkCents, amountCents - maxLocal);
    
    setState(prev => ({
      ...prev,
      selectedLocalCents: maxLocal,
      selectedNetworkCents: maxNetwork,
      applyCredits: true
    }));
  };

  const renderMerchantScreen = () => {
    switch (state.step) {
      case 'merchant-enter':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Merchant Terminal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bill Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={state.amount}
                  onChange={(e) => setState(prev => ({ ...prev, amount: e.target.value }))}
                  className="text-lg"
                />
              </div>
              <Button onClick={handleRequestPayment} className="w-full" size="lg">
                Request Payment
              </Button>
            </CardContent>
          </Card>
        );

      case 'qr-generated':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Payment QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="flex justify-center">
                <QRCodeSVG value={state.qrPayload} size={200} />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrencyDisplay(amountCents)}</p>
                <p className="text-sm text-muted-foreground">Transaction: {state.txId}</p>
              </div>
              <Badge variant="secondary">Waiting for customer scan...</Badge>
            </CardContent>
          </Card>
        );

      case 'customer-select':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Waiting for Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{formatCurrencyDisplay(amountCents)}</p>
                <p className="text-sm text-muted-foreground">Transaction: {state.txId}</p>
              </div>
              <Badge variant="secondary" className="w-full justify-center">
                Customer confirming payment...
              </Badge>
            </CardContent>
          </Card>
        );

      case 'processing':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Processing Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p>Verifying transaction...</p>
            </CardContent>
          </Card>
        );

      case 'complete':
        const totalCreditsUsed = state.selectedLocalCents + state.selectedNetworkCents;
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Payment Verified
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrencyDisplay(amountCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credits Applied:</span>
                  <span className="font-medium">{formatCurrencyDisplay(totalCreditsUsed)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Amount Collected:</span>
                  <span>{formatCurrencyDisplay(state.balanceCents)}</span>
                </div>
              </div>
              <Badge variant="secondary" className="w-full justify-center">
                +{formatCurrencyDisplay(state.balanceCents)} Added to your account
              </Badge>
              <Button onClick={handleReset} className="w-full" size="lg">
                Process Next Payment
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderCustomerScreen = () => {
    switch (state.step) {
      case 'merchant-enter':
      case 'qr-generated':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Customer App
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Scan & Pay</h3>
                  <p className="text-sm text-muted-foreground">
                    Scan merchant QR code to proceed
                  </p>
                </div>
                {state.step === 'qr-generated' && (
                  <Button onClick={handleSimulateScan} variant="outline" className="w-full">
                    Simulate Scan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'customer-select':
        const totalCreditsSelected = state.selectedLocalCents + state.selectedNetworkCents;
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Confirm Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Total Bill:</span>
                  <span className="font-bold">{formatCurrencyDisplay(amountCents)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>Apply Credits</span>
                  <Switch 
                    checked={state.applyCredits} 
                    onCheckedChange={handleToggleCredits}
                  />
                </div>

                {state.applyCredits && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Local Credits:</span>
                        <span>{formatCurrencyDisplay(state.selectedLocalCents)} / {formatCurrencyDisplay(state.availableLocalCents)}</span>
                      </div>
                      <Slider
                        value={[state.selectedLocalCents]}
                        onValueChange={([value]) => setState(prev => ({ ...prev, selectedLocalCents: value }))}
                        max={Math.min(state.availableLocalCents, amountCents)}
                        step={25}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Network Credits:</span>
                        <span>{formatCurrencyDisplay(state.selectedNetworkCents)} / {formatCurrencyDisplay(state.availableNetworkCents)}</span>
                      </div>
                      <Slider
                        value={[state.selectedNetworkCents]}
                        onValueChange={([value]) => setState(prev => ({ ...prev, selectedNetworkCents: value }))}
                        max={Math.min(state.availableNetworkCents, Math.max(0, amountCents - state.selectedLocalCents))}
                        step={25}
                        className="w-full"
                      />
                    </div>

                    <Button onClick={handleUseMaxCredits} variant="outline" size="sm" className="w-full">
                      Use Maximum Credits
                    </Button>
                  </div>
                )}

                <Separator />
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Credits Used:</span>
                    <span>{formatCurrencyDisplay(totalCreditsSelected)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Balance to Pay:</span>
                    <span>{formatCurrencyDisplay(state.balanceCents)}</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleConfirmPayment} className="w-full" size="lg">
                Confirm & Pay
              </Button>
            </CardContent>
          </Card>
        );

      case 'processing':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Processing Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p>Please wait while we process your payment...</p>
            </CardContent>
          </Card>
        );

      case 'complete':
        const totalCreditsUsed = state.selectedLocalCents + state.selectedNetworkCents;
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span className="font-medium">{formatCurrencyDisplay(state.balanceCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credits Used:</span>
                  <span className="font-medium">
                    {totalCreditsUsed > 0 ? formatCurrencyDisplay(totalCreditsUsed) : "No credits used"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Credits Earned:</span>
                  <span className="font-medium">${state.creditsEarnedDisplay}</span>
                </div>
              </div>
              <Badge variant="secondary" className="w-full justify-center">
                5% cashback earned
              </Badge>
              <Button onClick={handleReset} className="w-full" size="lg">
                Done
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">QR Scan & Pay Demo</h1>
          <Badge variant="outline">Demo Mode - Simulated Flow</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Merchant Screen</h2>
            {renderMerchantScreen()}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4 text-center">Customer Screen</h2>
            {renderCustomerScreen()}
          </div>
        </div>

        <div className="text-center mt-8">
          <Button onClick={handleReset} variant="outline">
            Reset Demo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DemoQRScanPay;