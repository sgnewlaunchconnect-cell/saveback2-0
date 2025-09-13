import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { 
  Store, 
  Search, 
  CreditCard, 
  CheckCircle2, 
  Hash,
  Receipt,
  Wallet
} from 'lucide-react';

interface CustomerFlow3PanelProps {
  state: {
    selectedMerchant: string;
    step: 'select' | 'match' | 'token' | 'credits' | 'code' | 'success';
    matchResult: any;
    laneToken: string;
    claimedTransaction: any;
    creditAmount: string;
    customerCode: string;
    maxCredits: number;
    isLoading: boolean;
  };
  actions: {
    setSelectedMerchant: (merchant: string) => void;
    setStep: (step: 'select' | 'match' | 'token' | 'credits' | 'code' | 'success') => void;
    setLaneToken: (token: string) => void;
    setCreditAmount: (amount: string) => void;
    findPendingTransaction: () => void;
    claimWithToken: () => void;
    applyCredits: () => void;
  };
  demoState: {
    activeMerchant: any;
    demoCredits: { local: number; network: number };
  };
}

export function CustomerFlow3Panel({ state, actions, demoState }: CustomerFlow3PanelProps) {
  const totalCredits = demoState.demoCredits.local + demoState.demoCredits.network;
  const creditValue = parseFloat(state.creditAmount) || 0;

  // Step 1: Select Merchant
  if (state.step === 'select') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Store className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Select Merchant</h3>
          <p className="text-sm text-muted-foreground">
            Choose the merchant you're paying at
          </p>
        </div>

        <Card className="p-4 cursor-pointer hover:bg-accent/50 border-primary" 
              onClick={() => actions.setSelectedMerchant(demoState.activeMerchant.id)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">{demoState.activeMerchant.name}</div>
              <div className="text-sm text-muted-foreground">
                {demoState.activeMerchant.id ? 'Connected' : 'Loading...'}
              </div>
            </div>
          </div>
        </Card>

        <Button
          onClick={actions.findPendingTransaction}
          disabled={!state.selectedMerchant || state.isLoading}
          className="w-full"
        >
          {state.isLoading ? 'Finding Bills...' : 'Find My Bill'}
        </Button>
      </div>
    );
  }

  // Step 2: Token Entry (if needed)
  if (state.step === 'token') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Hash className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Enter Lane Token</h3>
          <p className="text-sm text-muted-foreground">
            Multiple bills found. Ask cashier for your lane token
          </p>
        </div>

        {state.matchResult?.tokens && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Available Tokens:</Label>
            <div className="grid grid-cols-2 gap-2">
              {state.matchResult.tokens.map((tokenInfo: any, index: number) => (
                <Badge key={index} variant="outline" className="p-2 justify-center">
                  {tokenInfo.token} - ${tokenInfo.amount?.toFixed(2)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="lane-token">Lane Token</Label>
          <Input
            id="lane-token"
            placeholder="AB3F"
            value={state.laneToken}
            onChange={(e) => actions.setLaneToken(e.target.value.toUpperCase())}
            className="text-center text-xl font-mono tracking-wider"
            maxLength={4}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={actions.claimWithToken}
            disabled={!state.laneToken || state.isLoading}
            className="flex-1"
          >
            {state.isLoading ? 'Claiming...' : 'Claim Bill'}
          </Button>
          <Button
            variant="outline"
            onClick={() => actions.setStep('select')}
            disabled={state.isLoading}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Apply Credits
  if (state.step === 'credits') {
    const maxCreditsToUse = Math.min(state.maxCredits, totalCredits);
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CreditCard className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Payment Options</h3>
          <p className="text-sm text-muted-foreground">
            Bill: ${state.claimedTransaction?.amount?.toFixed(2)}
          </p>
        </div>

        {/* Credit Balance Display */}
        <Card className="p-4 bg-accent/20">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Local Credits:</span>
              <span className="font-medium">${demoState.demoCredits.local.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Network Credits:</span>
              <span className="font-medium">${demoState.demoCredits.network.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total Available:</span>
              <span>${totalCredits.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Payment Options */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => {
              actions.setCreditAmount('0');
              actions.applyCredits();
            }}
            disabled={state.isLoading}
            className="w-full h-auto p-4"
          >
            <div className="text-center">
              <div className="font-medium">Pay Full Amount</div>
              <div className="text-sm text-muted-foreground">
                ${state.claimedTransaction?.amount?.toFixed(2)} (No credits used)
              </div>
            </div>
          </Button>

          {maxCreditsToUse > 0 && (
            <Button
              onClick={() => {
                actions.setCreditAmount(maxCreditsToUse.toString());
                actions.applyCredits();
              }}
              disabled={state.isLoading}
              className="w-full h-auto p-4"
            >
              <div className="text-center">
                <div className="font-medium">Use Credits</div>
                <div className="text-sm opacity-90">
                  Apply ${maxCreditsToUse.toFixed(2)} credits • Pay ${(state.claimedTransaction?.amount - maxCreditsToUse).toFixed(2)}
                </div>
              </div>
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={() => actions.setStep('select')}
          disabled={state.isLoading}
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    );
  }

  // Step 4: Show Customer Code
  if (state.step === 'code') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Receipt className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Your Payment Code</h3>
          <p className="text-sm text-muted-foreground">
            Show this code to the cashier
          </p>
        </div>

        <Card className="p-6 text-center bg-primary/5">
          <div className="text-4xl font-mono font-bold tracking-wider text-primary mb-2">
            {state.customerCode}
          </div>
          <p className="text-xs text-muted-foreground">6-digit confirmation code</p>
        </Card>

        {/* Transaction Summary */}
        <Card className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Bill Amount:</span>
              <span>${state.claimedTransaction?.amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credits Used:</span>
              <span>-${creditValue.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Payment Due:</span>
              <span>${(state.claimedTransaction?.amount - creditValue).toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Pay the remaining amount via cash or PayNow
          </p>
        </div>
      </div>
    );
  }

  // Step 5: Payment Success
  if (state.step === 'success') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <h3 className="text-lg font-semibold mb-2">Payment Complete!</h3>
          <p className="text-sm text-muted-foreground">
            Thank you for your purchase
          </p>
        </div>

        {/* Transaction Summary */}
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Bill Amount:</span>
              <span>${state.claimedTransaction?.amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Credits Used:</span>
              <span>-${creditValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span>${(state.claimedTransaction?.amount - creditValue).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium text-green-700">
              <span>Transaction Complete</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Button
          onClick={() => {
            actions.setStep('select');
            actions.setSelectedMerchant('');
          }}
          className="w-full"
        >
          Start New Transaction
        </Button>
      </div>
    );
  }

  // Default state
  return (
    <div className="text-center py-12">
      <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
      <p className="text-muted-foreground">Select a merchant to begin</p>
    </div>
  );
}