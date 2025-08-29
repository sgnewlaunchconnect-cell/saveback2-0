import { useState, useEffect } from 'react';

interface DemoState {
  mode: 'customer' | 'merchant' | 'admin' | null;
  step: number;
  data: any;
}

export const useDemoMode = () => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>({
    mode: null,
    step: 0,
    data: {}
  });

  useEffect(() => {
    const checkDemoMode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const demoParam = urlParams.get('demo');
      console.log('useDemoMode: checking demo param:', demoParam);
      const isDemoActive = demoParam === '1';
      console.log('useDemoMode: setting demo mode to:', isDemoActive);
      setIsDemoMode(isDemoActive);
      
      if (isDemoActive) {
        // Initialize demo data
        setDemoState({
          mode: 'customer',
          step: 0,
          data: {
            mockUser: {
              id: 'demo-user-123',
              localCredits: 15.50,
              networkCredits: 8.25
            },
            mockMerchant: {
              id: 'demo-merchant-456',
              name: 'Demo Coffee Shop',
              category: 'food',
              psp_enabled: true,
              psp_fee_mode: 'absorb'
            },
            mockDeal: {
              id: 'demo-deal-789',
              title: '20% Off + 5% Cashback on Coffee',
              discount_pct: 20,
              cashback_pct: 5,
              reward_mode: 'both'
            },
            mockTransaction: null
          }
        });
      } else {
        console.log('useDemoMode: not demo mode, clearing demo state');
        setDemoState({
          mode: null,
          step: 0,
          data: {}
        });
      }
    };

    // Check immediately
    checkDemoMode();

    // Listen for URL changes (e.g., back/forward navigation)
    window.addEventListener('popstate', checkDemoMode);
    
    return () => {
      window.removeEventListener('popstate', checkDemoMode);
    };
  }, []);

  const startDemo = (mode: 'customer' | 'merchant' | 'admin') => {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', '1');
    window.history.pushState({}, '', url.toString());
    
    setIsDemoMode(true);
    setDemoState(prev => ({
      ...prev,
      mode,
      step: 0
    }));
  };

  const exitDemo = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.history.pushState({}, '', url.toString());
    
    setIsDemoMode(false);
    setDemoState({
      mode: null,
      step: 0,
      data: {}
    });
  };

  const nextStep = () => {
    setDemoState(prev => ({
      ...prev,
      step: prev.step + 1
    }));
  };

  const prevStep = () => {
    setDemoState(prev => ({
      ...prev,
      step: Math.max(0, prev.step - 1)
    }));
  };

  const updateDemoData = (key: string, value: any) => {
    setDemoState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [key]: value
      }
    }));
  };

  // Mock functions for demo mode
  const mockSupabaseCall = async (functionName: string, body: any) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    switch (functionName) {
      case 'createPendingTransaction':
        const paymentCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const mockTransaction = {
          paymentCode,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          transactionId: 'demo-tx-' + Math.random().toString(36).substring(2, 8),
          merchantName: demoState.data.mockMerchant?.name || 'Demo Merchant'
        };
        
        updateDemoData('mockTransaction', mockTransaction);
        
        return {
          data: {
            data: mockTransaction
          },
          error: null
        };
        
      case 'validatePendingTransaction':
        return {
          data: { success: true },
          error: null
        };
        
      case 'confirmCashCollection':
        return {
          data: { success: true },
          error: null
        };
        
      case 'checkPendingStatus':
        // Return different statuses based on demo step
        const status = demoState.step >= 2 ? 'completed' : demoState.step >= 1 ? 'validated' : 'pending';
        return {
          data: {
            data: { status }
          },
          error: null
        };
        
      default:
        return {
          data: { success: true },
          error: null
        };
    }
  };

  return {
    isDemoMode,
    demoState,
    startDemo,
    exitDemo,
    nextStep,
    prevStep,
    updateDemoData,
    mockSupabaseCall
  };
};