import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
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
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CreditCard className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Apply Credits</h3>
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

        {/* Credit Selection */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="credit-amount">Credits to Use</Label>
              <span className="text-sm text-muted-foreground">
                Max 50%: ${state.maxCredits?.toFixed(2)}
              </span>
            </div>
            <div className="space-y-3">
              <Slider
                value={[creditValue]}
                onValueChange={(value) => actions.setCreditAmount(value[0].toString())}
                max={Math.min(state.maxCredits, totalCredits)}
                step={0.01}
                className="w-full"
              />
              <Input
                id="credit-amount"
                type="number"
                step="0.01"
                value={state.creditAmount}
                onChange={(e) => actions.setCreditAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Preview */}
          {creditValue > 0 && (
            <Card className="p-4 bg-primary/5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Bill Amount:</span>
                  <span>${state.claimedTransaction?.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credits Applied:</span>
                  <span>-${creditValue.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>You'll Pay:</span>
                  <span>${(state.claimedTransaction?.amount - creditValue).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={actions.applyCredits}
            disabled={!creditValue || state.isLoading}
            className="flex-1"
          >
            {state.isLoading ? 'Applying...' : 'Apply Credits'}
          </Button>
          <Button
            variant="outline"
            onClick={() => actions.setStep('select')}
            disabled={state.isLoading}
          >
            Cancel
          </Button>
        </div>
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

  // Default state
  return (
    <div className="text-center py-12">
      <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
      <p className="text-muted-foreground">Select a merchant to begin</p>
    </div>
  );
}