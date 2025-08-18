import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, QrCode, CreditCard, Check, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreditFlowDemo() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentFlow, setCurrentFlow] = useState<'traditional' | 'credit-bypass'>('traditional');
  const [step, setStep] = useState(1);
  
  // Demo data
  const dealAmount = 1299; // $12.99
  const userCredits = 1500; // $15.00 (enough to cover full amount)
  const canCoverFull = userCredits >= dealAmount;

  const handleTraditionalFlow = () => {
    setCurrentFlow('traditional');
    setStep(1);
  };

  const handleCreditBypassFlow = () => {
    setCurrentFlow('credit-bypass');
    setStep(1);
  };

  const nextStep = () => {
    const maxSteps = currentFlow === 'traditional' ? 5 : 3;
    if (step < maxSteps) {
      setStep(step + 1);
    } else {
      toast({
        title: "Transaction Complete! 🎉",
        description: "Deal redeemed successfully with credits",
      });
      setStep(1);
    }
  };

  const renderTraditionalFlow = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>1</div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>2</div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>3</div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>4</div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 5 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>5</div>
      </div>

      {step === 1 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Step 1: Calculate Payment</h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              App shows user exactly how much they'll pay BEFORE going to merchant
            </p>
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Deal price:</span>
                <span>${(dealAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-700 dark:text-blue-300">
                <span>Credits available:</span>
                <span>${(userCredits / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-700 dark:text-blue-300">
                <span>Credits to use:</span>
                <span>-${(Math.min(userCredits, dealAmount) / 100).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-blue-800 dark:text-blue-200">
                <span>You'll pay:</span>
                <span className="text-green-600">{userCredits >= dealAmount ? "FREE" : `$${((dealAmount - userCredits) / 100).toFixed(2)}`}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <QrCode className="h-6 w-6 text-purple-600" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Step 2: User Shows QR/PIN</h3>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
              Customer goes to merchant knowing they'll pay {userCredits >= dealAmount ? "FREE" : `$${((dealAmount - userCredits) / 100).toFixed(2)}`}
            </p>
            <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded text-xs text-purple-700 dark:text-purple-300">
              💡 User is confident about final amount - no surprises!
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-6 w-6 text-orange-600" />
              <h3 className="font-semibold text-orange-900 dark:text-orange-100">Step 3: Merchant Scans & Confirms</h3>
            </div>
            <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
              Merchant scans QR/PIN and sees the calculated amount
            </p>
            <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span>Merchant sees:</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>• Deal: Coffee & Pastry</span>
                <span></span>
              </div>
              <div className="flex justify-between">
                <span>• Customer pays:</span>
                <span className="font-bold">{userCredits >= dealAmount ? "FREE" : `$${((dealAmount - userCredits) / 100).toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>• Credits applied:</span>
                <span>${(Math.min(userCredits, dealAmount) / 100).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">Step 4: Payment Processing</h3>
            </div>
            <p className="text-sm text-green-800 dark:text-green-200 mb-2">
              {userCredits >= dealAmount ? 
                "Credits cover full amount - no payment needed!" :
                `Customer pays $${((dealAmount - userCredits) / 100).toFixed(2)} (cash/card)`
              }
            </p>
            <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-xs text-green-700 dark:text-green-300">
              ✅ Amount matches what user expected - smooth transaction
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Check className="h-6 w-6 text-indigo-600" />
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Step 5: Transaction Complete</h3>
            </div>
            <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-2">
              Deal redeemed! User enjoys their purchase
            </p>
            <div className="bg-indigo-100 dark:bg-indigo-900/20 p-2 rounded text-xs text-indigo-700 dark:text-indigo-300">
              🎉 User earns new credits on any amount paid with cash/card
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCreditBypassFlow = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>1</div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>2</div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}>3</div>
      </div>

      {step === 1 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="h-6 w-6 text-blue-600" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">Step 1: User Chooses Credit Redemption</h3>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              User has enough credits to cover full amount - can redeem digitally
            </p>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="h-6 w-6 text-green-600" />
              <h3 className="font-semibold text-green-900 dark:text-green-100">Step 2: Instant Credit Redemption</h3>
            </div>
            <p className="text-sm text-green-800 dark:text-green-200 mb-2">
              Credits automatically redeemed - no merchant scan needed
            </p>
            <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded text-xs text-green-700 dark:text-green-300">
              ✅ Faster checkout - no QR scanning required
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Check className="h-6 w-6 text-purple-600" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Step 3: Digital Receipt</h3>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              User gets digital proof of redemption to show merchant if needed
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/payment-demo')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Credit Flow Options</h1>
            <p className="text-sm text-muted-foreground">
              Compare merchant scan vs credit-only flows
            </p>
          </div>
        </div>

        {/* Deal Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Demo Deal: Coffee & Pastry</h3>
            <div className="flex justify-between items-center">
              <span>Price: ${(dealAmount / 100).toFixed(2)}</span>
              <Badge variant={canCoverFull ? "default" : "secondary"}>
                Credits: ${(userCredits / 100).toFixed(2)}
              </Badge>
            </div>
            {canCoverFull && (
              <p className="text-xs text-green-600 mt-1">✅ Credits can cover full amount</p>
            )}
          </CardContent>
        </Card>

        {/* Flow Selection */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={currentFlow === 'traditional' ? 'default' : 'outline'}
            onClick={handleTraditionalFlow}
            className="h-auto p-3 flex-col"
          >
            <QrCode className="h-5 w-5 mb-1" />
            <span className="text-xs">Traditional</span>
            <span className="text-xs opacity-70">User Knows Amount</span>
          </Button>
          <Button
            variant={currentFlow === 'credit-bypass' ? 'default' : 'outline'}
            onClick={handleCreditBypassFlow}
            className="h-auto p-3 flex-col"
          >
            <Zap className="h-5 w-5 mb-1" />
            <span className="text-xs">Credit Bypass</span>
            <span className="text-xs opacity-70">No Scan</span>
          </Button>
        </div>

        {/* Flow Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentFlow === 'traditional' ? 'Traditional Flow (User Knows Amount)' : 'Credit Bypass Flow'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentFlow === 'traditional' ? renderTraditionalFlow() : renderCreditBypassFlow()}
            
            <Button 
              onClick={nextStep}
              className="w-full mt-4"
            >
              {step === (currentFlow === 'traditional' ? 5 : 3) ? 'Complete & Restart' : 'Next Step'}
            </Button>
          </CardContent>
        </Card>

        {/* Key Insight */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-yellow-900 dark:text-yellow-100">
              💡 Key Answer: User Knows Payment Amount Before Going to Merchant
            </h3>
            <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
              <p><strong>Step 1:</strong> App calculates final amount (credits + remaining)</p>
              <p><strong>Step 2:</strong> User goes to merchant knowing exactly what they'll pay</p>
              <p><strong>Step 3:</strong> Merchant scans and confirms the pre-calculated amount</p>
              <p><strong>Result:</strong> No surprises, smooth transaction for both parties</p>
            </div>
          </CardContent>
        </Card>

        {/* Comparison */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">📊 Flow Comparison</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>Traditional (User Knows Amount):</strong>
                <ul className="text-xs ml-3 mt-1 space-y-1">
                  <li>• User sees final amount BEFORE going to merchant</li>
                  <li>• Merchant confirms pre-calculated amount</li>
                  <li>• Transparent and predictable for both parties</li>
                  <li>• Works for all payment scenarios</li>
                </ul>
              </div>
              <div>
                <strong>Credit Bypass (No Scan):</strong>
                <ul className="text-xs ml-3 mt-1 space-y-1">
                  <li>• Only works when credits cover 100%</li>
                  <li>• Faster for credit-only transactions</li>
                  <li>• Good for digital-only deals</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}