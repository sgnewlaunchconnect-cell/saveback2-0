import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Users, Receipt, CheckCircle2 } from 'lucide-react';

interface MerchantFlow3PanelProps {
  state: {
    selectedTerminal: string;
    billAmount: string;
    pendingTransactions: any[];
    isCreating: boolean;
    confirmationStep: boolean;
    customerCode: string;
    isConfirming: boolean;
  };
  actions: {
    setSelectedTerminal: (terminal: string) => void;
    setBillAmount: (amount: string) => void;
    createPendingTransaction: () => void;
    setConfirmationStep: (step: boolean) => void;
    setCustomerCode: (code: string) => void;
    confirmTransaction: () => void;
  };
  demoState: {
    terminals: any[];
    activeMerchant: any;
  };
}

export function MerchantFlow3Panel({ state, actions, demoState }: MerchantFlow3PanelProps) {
  if (state.confirmationStep) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Receipt className="h-12 w-12 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Enter Customer Code</h3>
          <p className="text-sm text-muted-foreground">
            Ask customer for their 6-digit confirmation code
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="customer-code">Customer Code</Label>
            <Input
              id="customer-code"
              placeholder="123456"
              value={state.customerCode}
              onChange={(e) => actions.setCustomerCode(e.target.value)}
              className="text-center text-xl font-mono tracking-wider"
              maxLength={6}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={actions.confirmTransaction}
              disabled={state.customerCode.length !== 6 || state.isConfirming}
              className="flex-1"
            >
              {state.isConfirming ? 'Confirming...' : 'Confirm Payment'}
            </Button>
            <Button
              variant="outline"
              onClick={() => actions.setConfirmationStep(false)}
              disabled={state.isConfirming}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Bill Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Create New Bill</h3>
        
        <div className="space-y-3">
          <div>
            <Label htmlFor="terminal">Terminal</Label>
            <Select 
              value={state.selectedTerminal} 
              onValueChange={actions.setSelectedTerminal}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select terminal" />
              </SelectTrigger>
              <SelectContent>
                {demoState.terminals.map((terminal) => (
                  <SelectItem key={terminal.id} value={terminal.id}>
                    {terminal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Bill Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={state.billAmount}
              onChange={(e) => actions.setBillAmount(e.target.value)}
            />
          </div>

          <Button
            onClick={actions.createPendingTransaction}
            disabled={!state.billAmount || !state.selectedTerminal || state.isCreating}
            className="w-full"
          >
            {state.isCreating ? 'Creating...' : 'Create Pending Bill'}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Queue Status */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Queue Status</h3>
          <Badge variant="secondary" className="ml-auto">
            {state.pendingTransactions.length} pending
          </Badge>
        </div>

        {state.pendingTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pending bills</p>
          </div>
        ) : (
          <div className="space-y-2">
            {state.pendingTransactions.map((transaction, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">${transaction.amount?.toFixed(2)}</div>
                    {transaction.lane_token && (
                      <div className="text-sm text-muted-foreground">
                        Token: <span className="font-mono font-semibold">{transaction.lane_token}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      Awaiting Customer
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {state.pendingTransactions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => actions.setConfirmationStep(true)}
            className="w-full"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Enter Customer Code
          </Button>
        )}
      </div>
    </div>
  );
}