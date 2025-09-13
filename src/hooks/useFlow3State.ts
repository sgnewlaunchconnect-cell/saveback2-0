import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MerchantState {
  selectedTerminal: string;
  billAmount: string;
  pendingTransactions: any[];
  isCreating: boolean;
  confirmationStep: boolean;
  customerCode: string;
  isConfirming: boolean;
}

interface CustomerState {
  selectedMerchant: string;
  step: 'select' | 'match' | 'token' | 'credits' | 'code' | 'success';
  matchResult: any;
  laneToken: string;
  claimedTransaction: any;
  creditAmount: string;
  customerCode: string;
  maxCredits: number;
  isLoading: boolean;
}

interface DemoState {
  activeMerchant: any;
  terminals: any[];
  demoCredits: { local: number; network: number };
  simulationMode: 'quiet' | 'busy' | 'custom';
}

export function useFlow3State() {
  const [merchantState, setMerchantState] = useState<MerchantState>({
    selectedTerminal: '',
    billAmount: '',
    pendingTransactions: [],
    isCreating: false,
    confirmationStep: false,
    customerCode: '',
    isConfirming: false,
  });

  const [customerState, setCustomerState] = useState<CustomerState>({
    selectedMerchant: '',
    step: 'select',
    matchResult: null,
    laneToken: '',
    claimedTransaction: null,
    creditAmount: '',
    customerCode: '',
    maxCredits: 0,
    isLoading: false,
  });

  const [demoState, setDemoState] = useState<DemoState>({
    activeMerchant: { id: '', name: 'Kaeden Coffee' },
    terminals: [], // Will be loaded from database
    demoCredits: { local: 12.00, network: 6.00 },
    simulationMode: 'quiet',
  });

  // Load terminals and merchant on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load a real merchant first
        const { data: merchants, error: merchantError } = await supabase
          .from('merchants')
          .select('id, name')
          .eq('is_active', true)
          .limit(1);

        if (merchantError) throw merchantError;

        const merchant = merchants?.[0] || { id: 'demo-merchant', name: 'Kaeden Coffee' };

        // Load terminals for this merchant
        const { data: terminals, error: terminalError } = await supabase
          .from('merchant_terminals')
          .select('id, label, merchant_id')
          .eq('is_active', true)
          .eq('merchant_id', merchant.id)
          .limit(3);

        if (terminalError) {
          console.warn('No terminals found for merchant, using demo mode');
          // Fallback: load any terminals
          const { data: fallbackTerminals } = await supabase
            .from('merchant_terminals')
            .select('id, label')
            .eq('is_active', true)
            .limit(3);

          setDemoState(prev => ({
            ...prev,
            activeMerchant: merchant,
            terminals: fallbackTerminals?.map(t => ({ id: t.id, label: t.label })) || []
          }));

          if (fallbackTerminals?.length > 0) {
            setMerchantState(prev => ({
              ...prev,
              selectedTerminal: fallbackTerminals[0].id
            }));
          }
        } else {
          setDemoState(prev => ({
            ...prev,
            activeMerchant: merchant,
            terminals: terminals?.map(t => ({ id: t.id, label: t.label })) || []
          }));

          if (terminals?.length > 0) {
            setMerchantState(prev => ({
              ...prev,
              selectedTerminal: terminals[0].id
            }));
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to demo mode
        setDemoState(prev => ({
          ...prev,
          activeMerchant: { id: 'demo-merchant', name: 'Kaeden Coffee' }
        }));
      }
    };

    loadData();
  }, []);

  // Merchant Actions
  const createPendingTransaction = useCallback(async () => {
    if (!merchantState.billAmount || !merchantState.selectedTerminal) {
      toast.error('Please enter amount and select terminal');
      return;
    }

    setMerchantState(prev => ({ ...prev, isCreating: true }));

    try {
      const { data, error } = await supabase.functions.invoke('createPendingFlow3', {
        body: {
          merchant_id: demoState.activeMerchant.id,
          terminal_id: merchantState.selectedTerminal,
          amount: parseFloat(merchantState.billAmount),
        },
      });

      if (error) throw error;

      toast.success(`Bill created${data.lane_token ? ` with token ${data.lane_token}` : ''}`);
      
      setMerchantState(prev => ({
        ...prev,
        pendingTransactions: [...prev.pendingTransactions, data],
        billAmount: '',
      }));
    } catch (error) {
      console.error('Error creating pending transaction:', error);
      toast.error('Failed to create bill');
    } finally {
      setMerchantState(prev => ({ ...prev, isCreating: false }));
    }
  }, [merchantState.billAmount, merchantState.selectedTerminal, demoState.activeMerchant.id]);

  const confirmTransaction = useCallback(async () => {
    if (!merchantState.customerCode) {
      toast.error('Please enter customer code');
      return;
    }

    setMerchantState(prev => ({ ...prev, isConfirming: true }));

    try {
      // Find the pending transaction that matches the customer code
      const pending = merchantState.pendingTransactions.find(p => 
        p.customer_code === merchantState.customerCode
      );

      if (!pending) {
        toast.error('Invalid customer code');
        return;
      }

      const { data, error } = await supabase.functions.invoke('confirmFlow3', {
        body: {
          pending_id: pending.pending_id,
          customer_code: merchantState.customerCode,
        },
      });

      if (error) throw error;

      toast.success(`Transaction confirmed! Collect $${data.net_payable.toFixed(2)}`);
      
      setMerchantState(prev => ({
        ...prev,
        pendingTransactions: prev.pendingTransactions.filter(p => p.pending_id !== pending.pending_id),
        confirmationStep: false,
        customerCode: '',
      }));
    } catch (error) {
      console.error('Error confirming transaction:', error);
      toast.error('Failed to confirm transaction');
    } finally {
      setMerchantState(prev => ({ ...prev, isConfirming: false }));
    }
  }, [merchantState.customerCode, merchantState.pendingTransactions]);

  // Customer Actions
  const findPendingTransaction = useCallback(async () => {
    if (!demoState.activeMerchant.id) {
      toast.error('Merchant not loaded yet');
      return;
    }

    setCustomerState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('findPendingFlow3', {
        body: {
          merchant_id: demoState.activeMerchant.id,
          terminal_id: merchantState.selectedTerminal,
        },
      });

      if (error) throw error;

      setCustomerState(prev => ({
        ...prev,
        matchResult: data,
        step: data.auto_match ? 'credits' : 'token',
      }));

      if (data.auto_match) {
        setCustomerState(prev => ({
          ...prev,
          claimedTransaction: data,
          maxCredits: data.amount * 0.5,
        }));
      }
    } catch (error) {
      console.error('Error finding pending transaction:', error);
      toast.error('No pending bills found. Create a bill first.');
    } finally {
      setCustomerState(prev => ({ ...prev, isLoading: false }));
    }
  }, [demoState.activeMerchant.id, merchantState.selectedTerminal]);

  const claimWithToken = useCallback(async () => {
    if (!customerState.laneToken) {
      toast.error('Please enter lane token');
      return;
    }

    setCustomerState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('claimPendingFlow3', {
        body: {
          terminal_id: merchantState.selectedTerminal,
          lane_token: customerState.laneToken,
        },
      });

      if (error) throw error;

      setCustomerState(prev => ({
        ...prev,
        claimedTransaction: data,
        maxCredits: data.amount * 0.5,
        step: 'credits',
      }));
    } catch (error) {
      console.error('Error claiming transaction:', error);
      toast.error('Invalid token or transaction expired');
    } finally {
      setCustomerState(prev => ({ ...prev, isLoading: false }));
    }
  }, [customerState.laneToken, merchantState.selectedTerminal]);

  const applyCredits = useCallback(async () => {
    if (!customerState.claimedTransaction || !customerState.creditAmount) {
      toast.error('Please enter credit amount');
      return;
    }

    setCustomerState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('applyCreditsFlow3', {
        body: {
          pending_id: customerState.claimedTransaction.pending_id,
          requested_credits: parseFloat(customerState.creditAmount),
        },
      });

      if (error) throw error;

      setCustomerState(prev => ({
        ...prev,
        customerCode: data.customer_code,
        step: 'code',
      }));

      setDemoState(prev => ({
        ...prev,
        demoCredits: data.demo_credits_remaining,
      }));

      toast.success('Credits applied! Show code to cashier');
    } catch (error) {
      console.error('Error applying credits:', error);
      toast.error('Failed to apply credits');
    } finally {
      setCustomerState(prev => ({ ...prev, isLoading: false }));
    }
  }, [customerState.claimedTransaction, customerState.creditAmount]);

  // Demo Actions
  const simulateScenario = useCallback(async (scenario: 'quiet' | 'busy') => {
    setDemoState(prev => ({ ...prev, simulationMode: scenario }));
    
    if (scenario === 'busy') {
      // Create multiple pending transactions
      const amounts = [12, 8, 20];
      for (const amount of amounts) {
        await supabase.functions.invoke('createPendingFlow3', {
          body: {
            merchant_id: demoState.activeMerchant.id,
            terminal_id: merchantState.selectedTerminal || 'term-1',
            amount,
          },
        });
      }
      toast.success('Simulated busy queue with 3 pending bills');
    } else {
      toast.success('Reset to quiet mode');
    }
  }, [demoState.activeMerchant.id, merchantState.selectedTerminal]);

  const resetDemo = useCallback(() => {
    setMerchantState({
      selectedTerminal: '',
      billAmount: '',
      pendingTransactions: [],
      isCreating: false,
      confirmationStep: false,
      customerCode: '',
      isConfirming: false,
    });
    
    setCustomerState({
      selectedMerchant: '',
      step: 'select',
      matchResult: null,
      laneToken: '',
      claimedTransaction: null,
      creditAmount: '',
      customerCode: '',
      maxCredits: 0,
      isLoading: false,
    });

    setDemoState(prev => ({
      ...prev,
      demoCredits: { local: 12.00, network: 6.00 },
      simulationMode: 'quiet',
    }));

    toast.success('Demo reset');
  }, []);

  return {
    merchantState,
    customerState,
    demoState,
    actions: {
      merchant: {
        setSelectedTerminal: (terminal: string) => 
          setMerchantState(prev => ({ ...prev, selectedTerminal: terminal })),
        setBillAmount: (amount: string) => 
          setMerchantState(prev => ({ ...prev, billAmount: amount })),
        createPendingTransaction,
        setConfirmationStep: (step: boolean) => 
          setMerchantState(prev => ({ ...prev, confirmationStep: step })),
        setCustomerCode: (code: string) => 
          setMerchantState(prev => ({ ...prev, customerCode: code })),
        confirmTransaction,
      },
      customer: {
        setSelectedMerchant: (merchant: string) => 
          setCustomerState(prev => ({ ...prev, selectedMerchant: merchant })),
        setStep: (step: CustomerState['step']) => 
          setCustomerState(prev => ({ ...prev, step })),
        setLaneToken: (token: string) => 
          setCustomerState(prev => ({ ...prev, laneToken: token })),
        setCreditAmount: (amount: string) => 
          setCustomerState(prev => ({ ...prev, creditAmount: amount })),
        findPendingTransaction,
        claimWithToken,
        applyCredits,
      },
      demo: {
        simulateScenario,
        resetDemo,
        setDemoCredits: (credits: { local: number; network: number }) =>
          setDemoState(prev => ({ ...prev, demoCredits: credits })),
      },
    },
  };
}