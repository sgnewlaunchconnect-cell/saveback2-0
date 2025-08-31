import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
import { formatCurrencyDisplay } from "@/utils/currency";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Smartphone, CheckCircle, CreditCard, Clock, Hash, Tag, Store, MapPin, Users, ArrowRight, X, User } from "lucide-react";
import DealBadge from "@/components/DealBadge";

type DemoStep = 'grab-deal' | 'merchant-enter' | 'qr-generated' | 'customer-select' | 'awaiting-merchant' | 'processing' | 'complete';

interface QueueCustomer {
  id: string;
  displayName: string;
  deal?: MockDeal;
  amount: string;
  code6: string;
  isReadyToPay: boolean;
  paymentWindowExpiry?: Date;
}

interface HoldData {
  dealId: string;
  grabbedAt: Date;
  expiresAt: Date;
  pin: string;
}

interface GrabAttempt {
  timestamp: Date;
  dealId: string;
}

interface MockDeal {
  id: string;
  title: string;
  merchantName: string;
  discountPct?: number;
  cashbackPct?: number;
  address: string;
}

interface DemoState {
  step: DemoStep;
  amount: string;
  txId: string;
  qrPayload: string;
  code6: string;
  availableLocalCents: number;
  availableNetworkCents: number;
  applyCredits: boolean;
  selectedLocalCents: number;
  selectedNetworkCents: number;
  balanceCents: number;
  creditsEarnedCents: number;
  manualCodeInput: string;
  selectedDeal?: MockDeal;
  displayName: string;
  isReadyToPay: boolean;
  queue: QueueCustomer[];
  currentlyServing?: string;
  currentHold?: HoldData;
  noShowCount: number;
}

const DemoQRScanPay = () => {
  const { toast } = useToast();

  // Anti-grab-for-fun constants
  const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes
  const PAYMENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_GRAB_ATTEMPTS = 3;
  const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes after too many attempts
  
  // Merchant default cashback percentage
  const merchantDefaultCashbackPct = 10;
  
  // Mock deals for demonstration
  const mockDeals: MockDeal[] = [
    {
      id: '1',
      title: '20% off Coffee & Pastries',
      merchantName: 'The Coffee Bean',
      discountPct: 20,
      address: '123 Main St, Downtown'
    },
    {
      id: '2', 
      title: 'Buy 2 Get 1 Free Bubble Tea',
      merchantName: 'Bubble Bliss',
      discountPct: 15,
      cashbackPct: 5,
      address: '456 Queen St, Midtown'
    },
    {
      id: '3',
      title: '10% Cashback on All Items',
      merchantName: 'Fresh Market',
      cashbackPct: 10,
      address: '789 King Ave, Uptown'
    },
    {
      id: '4',
      title: 'Free Delivery on Orders $25+',
      merchantName: 'Local Eats',
      cashbackPct: 8,
      address: '321 Broadway, Central'
    }
  ];
  
  // Initialize display name from localStorage
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem('demoDisplayName') || 'Alex Chen';
  });

  const [state, setState] = useState<DemoState>({
    step: 'merchant-enter',
    amount: '',
    txId: '',
    qrPayload: '',
    code6: '',
    availableLocalCents: 800, // $8.00
    availableNetworkCents: 1200, // $12.00
    applyCredits: true,
    selectedLocalCents: 0,
    selectedNetworkCents: 0,
    balanceCents: 0,
    creditsEarnedCents: 0,
    manualCodeInput: '',
    displayName: displayName,
    isReadyToPay: false,
    queue: [
      // Seed with two demo customers
      {
        id: 'demo-customer-1',
        displayName: 'Jamie L.',
        deal: mockDeals[0],
        amount: '12.50',
        code6: '123456',
        isReadyToPay: true
      },
      {
        id: 'demo-customer-2', 
        displayName: 'Priya K.',
        amount: '8.75',
        code6: '789012',
        isReadyToPay: true
      }
    ],
    currentlyServing: undefined,
    currentHold: undefined,
    noShowCount: 0
  });

  // Timer for countdown updates
  const [currentTime, setCurrentTime] = useState(new Date());

  // Timer effect for countdowns and expiry
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      setState(prev => {
        let updated = { ...prev };
        
        // Check hold expiry
        if (prev.currentHold && new Date() >= prev.currentHold.expiresAt) {
          updated.currentHold = undefined;
          updated.selectedDeal = undefined;
          toast({ 
            title: "Hold Expired", 
            description: "Your deal hold has expired. Please grab again if needed.",
            variant: "destructive"
          });
        }
        
        // Check payment window expiry and auto-remove from queue
        const updatedQueue = prev.queue.filter(customer => {
          if (customer.paymentWindowExpiry && new Date() >= customer.paymentWindowExpiry) {
            if (customer.id === prev.txId) {
              // This is the current user's payment that expired
              updated.noShowCount = prev.noShowCount + 1;
              updated.step = 'merchant-enter';
              updated.currentlyServing = undefined;
              updated.isReadyToPay = false;
              toast({ 
                title: "Payment Expired", 
                description: "Payment window expired. Marked as no-show.",
                variant: "destructive"
              });
            }
            return false; // Remove from queue
          }
          return true; // Keep in queue
        });
        
        if (updatedQueue.length !== prev.queue.length) {
          updated.queue = updatedQueue;
        }
        
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [toast]);

  // Save display name to localStorage and update queue when it changes
  const updateDisplayName = (newName: string) => {
    setDisplayName(newName);
    localStorage.setItem('demoDisplayName', newName);
    setState(prev => ({
      ...prev,
      displayName: newName,
      queue: prev.queue.map(customer => 
        customer.id === prev.txId ? { ...customer, displayName: newName } : customer
      )
    }));
  };

  // Rate limiting functions
  const getGrabAttempts = (): GrabAttempt[] => {
    const stored = localStorage.getItem('demoGrabAttempts');
    if (!stored) return [];
    
    try {
      const attempts = JSON.parse(stored);
      return attempts.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp)
      }));
    } catch {
      return [];
    }
  };

  const addGrabAttempt = (dealId: string) => {
    const attempts = getGrabAttempts();
    const newAttempt: GrabAttempt = {
      timestamp: new Date(),
      dealId
    };
    
    attempts.push(newAttempt);
    localStorage.setItem('demoGrabAttempts', JSON.stringify(attempts));
  };

  const getRecentAttempts = (): GrabAttempt[] => {
    const attempts = getGrabAttempts();
    const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    return attempts.filter(a => a.timestamp >= cutoff);
  };

  const isRateLimited = (): boolean => {
    const recentAttempts = getRecentAttempts();
    return recentAttempts.length >= MAX_GRAB_ATTEMPTS;
  };

  const getCooldownExpiry = (): Date | null => {
    const attempts = getGrabAttempts();
    if (attempts.length < MAX_GRAB_ATTEMPTS) return null;
    
    const sortedAttempts = attempts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const thirdMostRecent = sortedAttempts[MAX_GRAB_ATTEMPTS - 1];
    
    return new Date(thirdMostRecent.timestamp.getTime() + COOLDOWN_MS);
  };

  const amountCents = Math.round(parseFloat(state.amount) * 100) || 0;
  
  // Calculate effective bill with discounts and active cashback
  const activeCashbackPct = state.selectedDeal?.cashbackPct ?? merchantDefaultCashbackPct;
  const discountPct = state.selectedDeal?.discountPct ?? 0;
  const discountCents = Math.floor(amountCents * discountPct / 100);
  const effectiveBillCents = amountCents - discountCents;

  // Auto-allocate credits with local-first, then network (based on effective bill)
  const allocateCredits = (apply: boolean) => {
    if (!apply) {
      return { local: 0, network: 0, balance: effectiveBillCents };
    }
    
    const maxLocal = Math.min(state.availableLocalCents, effectiveBillCents);
    const maxNetwork = Math.min(state.availableNetworkCents, effectiveBillCents - maxLocal);
    
    return {
      local: maxLocal,
      network: maxNetwork,
      balance: effectiveBillCents - maxLocal - maxNetwork
    };
  };

  const handleRequestPayment = () => {
    if (!state.amount || parseFloat(state.amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    const txId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    const code6 = txId.slice(-6).padStart(6, '0');
    const qrPayload = JSON.stringify({ 
      amount: state.amount, 
      txId,
      dealId: state.selectedDeal?.id,
      cashbackPct: activeCashbackPct,
      discountPct: discountPct
    });
    
    // Create payment window expiry (5 minutes from now)
    const paymentWindowExpiry = new Date(Date.now() + PAYMENT_WINDOW_MS);
    
    // Auto-add to queue when QR is generated
    const customer: QueueCustomer = {
      id: txId,
      displayName: displayName,
      deal: state.selectedDeal,
      amount: state.amount,
      code6: code6,
      isReadyToPay: true,
      paymentWindowExpiry
    };
    
    setState(prev => ({
      ...prev,
      step: 'qr-generated',
      txId,
      code6,
      qrPayload,
      isReadyToPay: true,
      queue: [...prev.queue, customer]
    }));
    
    toast({ title: "Payment QR Generated", description: `Amount: ${formatCurrencyDisplay(effectiveBillCents)} - 5min window` });
  };

  const handleSimulateScan = () => {
    const { local, network, balance } = allocateCredits(state.applyCredits);
    setState(prev => ({
      ...prev,
      step: 'customer-select',
      selectedLocalCents: local,
      selectedNetworkCents: network,
      balanceCents: balance
    }));
    
    toast({ title: "QR Code Scanned", description: "Select your credit usage" });
  };

  const handleManualCodeEntry = () => {
    if (state.manualCodeInput === state.code6) {
      const { local, network, balance } = allocateCredits(state.applyCredits);
      setState(prev => ({
        ...prev,
        step: 'customer-select',
        manualCodeInput: '',
        selectedLocalCents: local,
        selectedNetworkCents: network,
        balanceCents: balance
      }));
      toast({ title: "Code Verified", description: "Select your credit usage" });
    } else {
      toast({ title: "Invalid Code", description: "Please enter the correct 6-digit code", variant: "destructive" });
    }
  };

  const handleConfirmPayment = () => {
    setState(prev => ({ ...prev, step: 'awaiting-merchant' }));
    toast({ title: "Payment Submitted", description: "Waiting for merchant confirmation" });
  };

  const handleMerchantConfirm = () => {
    // Check if payment window has expired
    const currentCustomerInQueue = state.queue.find(c => c.id === state.txId);
    if (currentCustomerInQueue?.paymentWindowExpiry && new Date() >= currentCustomerInQueue.paymentWindowExpiry) {
      toast({ 
        title: "Payment Expired", 
        description: "Cannot confirm - payment window has expired.",
        variant: "destructive"
      });
      return;
    }

    setState(prev => ({ ...prev, step: 'processing' }));
    toast({ title: "Processing Payment...", description: "Please wait" });
    
    setTimeout(() => {
      const creditsEarnedCents = Math.floor(state.balanceCents * activeCashbackPct / 100);
      setState(prev => ({ 
        ...prev, 
        step: 'complete',
        creditsEarnedCents,
        // Remove from queue on completion
        queue: prev.queue.filter(c => c.id !== prev.txId),
        currentlyServing: undefined,
        isReadyToPay: false,
        currentHold: undefined // Clear hold on completion
      }));
      toast({ title: "Payment Verified!", description: "Transaction completed" });
    }, 1500);
  };

  const handleGrabDeal = (deal: MockDeal) => {
    // Check rate limiting
    if (isRateLimited()) {
      const cooldownExpiry = getCooldownExpiry();
      const remainingMs = cooldownExpiry ? cooldownExpiry.getTime() - Date.now() : 0;
      const remainingMins = Math.ceil(remainingMs / 60000);
      
      toast({ 
        title: "Too Many Attempts", 
        description: `Please wait ${remainingMins} more minutes before grabbing deals.`,
        variant: "destructive"
      });
      return;
    }

    // Add grab attempt for rate limiting
    addGrabAttempt(deal.id);

    // Generate 6-digit PIN for the grab pass
    const pin = Math.random().toString().slice(2, 8).padStart(6, '0');

    // Create hold with 10-minute expiry and PIN
    const holdExpiry = new Date(Date.now() + HOLD_DURATION_MS);
    const holdData: HoldData = {
      dealId: deal.id,
      grabbedAt: new Date(),
      expiresAt: holdExpiry,
      pin: pin
    };

    setState(prev => ({
      ...prev,
      selectedDeal: deal,
      currentHold: holdData,
      step: 'grab-deal'
    }));
    
    toast({ 
      title: "Deal Grabbed!", 
      description: `${deal.title} - Hold expires in 10 minutes` 
    });
  };

  const handleCancelHold = () => {
    setState(prev => ({
      ...prev,
      selectedDeal: undefined,
      currentHold: undefined
    }));
    
    toast({ 
      title: "Hold Cancelled", 
      description: "You can grab another deal if needed." 
    });
  };

  const handleSkipDeals = () => {
    setState(prev => ({
      ...prev,
      selectedDeal: undefined,
      currentHold: undefined
    }));
    toast({ 
      title: "Using Default Reward", 
      description: `${merchantDefaultCashbackPct}% cashback on all payments` 
    });
  };

  const handleUseNow = () => {
    setState(prev => ({
      ...prev,
      step: 'merchant-enter'
    }));
    toast({ 
      title: "Ready to Pay", 
      description: "Switch to merchant panel to proceed" 
    });
  };

  const handleReset = () => {
    // Remove current user from queue on reset
    setState(prev => ({
      step: 'merchant-enter',
      amount: '',
      txId: '',
      qrPayload: '',
      code6: '',
      availableLocalCents: 800,
      availableNetworkCents: 1200,
      applyCredits: true,
      selectedLocalCents: 0,
      selectedNetworkCents: 0,
      balanceCents: 0,
      creditsEarnedCents: 0,
      manualCodeInput: '',
      selectedDeal: undefined,
      displayName: displayName,
      isReadyToPay: false,
      queue: prev.queue.filter(c => c.id !== prev.txId),
      currentlyServing: undefined,
      currentHold: undefined,
      noShowCount: prev.noShowCount // Keep no-show count
    }));
  };

  const handleToggleCredits = (checked: boolean) => {
    const { local, network, balance } = allocateCredits(checked);
    setState(prev => ({
      ...prev,
      applyCredits: checked,
      selectedLocalCents: local,
      selectedNetworkCents: network,
      balanceCents: balance
    }));
  };


  const handleCallNext = (customerId: string) => {
    setState(prev => ({ ...prev, currentlyServing: customerId }));
    toast({ title: "Customer Called", description: "Now serving customer" });
  };

  const handleSkipCustomer = (customerId: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(c => c.id !== customerId),
      currentlyServing: prev.currentlyServing === customerId ? undefined : prev.currentlyServing
    }));
    toast({ title: "Customer Skipped", description: "Customer removed from queue" });
  };

  const handleQuickPay = () => {
    setState(prev => ({
      ...prev,
      step: 'merchant-enter',
      amount: '',
      selectedDeal: undefined,
      currentlyServing: undefined
    }));
    toast({ title: "Quick Pay Mode", description: "Ready for walk-in customer" });
  };

  const handleServeNext = () => {
    const nextCustomer = state.queue[0];
    if (nextCustomer) {
      setState(prev => ({ ...prev, currentlyServing: nextCustomer.id }));
      toast({ title: "Serving Next Customer", description: `Now serving ${nextCustomer.displayName}` });
    }
  };

  const handleSimulateIncoming = () => {
    const names = ['David R.', 'Sarah M.', 'Mike T.', 'Lisa W.', 'Chris P.', 'Anna S.'];
    const amounts = ['15.25', '22.50', '9.99', '18.75', '12.00', '27.80'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
    const randomDeal = Math.random() > 0.5 ? mockDeals[Math.floor(Math.random() * mockDeals.length)] : undefined;
    
    const newCustomer: QueueCustomer = {
      id: `incoming-${Date.now()}`,
      displayName: randomName,
      deal: randomDeal,
      amount: randomAmount,
      code6: Math.random().toString(36).substring(2, 8).toUpperCase(),
      isReadyToPay: true
    };
    
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, newCustomer]
    }));
    
    toast({ title: "New Customer", description: `${randomName} joined the queue` });
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
              {state.selectedDeal ? (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Deal Active</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{state.selectedDeal.title}</p>
                    <p className="text-muted-foreground">{state.selectedDeal.merchantName}</p>
                    <div className="mt-1">
                      <DealBadge 
                        discountPct={state.selectedDeal.discountPct} 
                        cashbackPct={state.selectedDeal.cashbackPct}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Default Reward</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-green-800 dark:text-green-200">{merchantDefaultCashbackPct}% Cashback on All Payments</p>
                    <p className="text-green-600 dark:text-green-400">No deals required - automatic reward</p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Bill Amount</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={state.amount}
                  onChange={(e) => setState(prev => ({ ...prev, amount: e.target.value }))}
                  className="text-lg"
                />
                {amountCents > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground space-y-1">
                    {discountCents > 0 && (
                      <div className="flex justify-between">
                        <span>Discount ({discountPct}%):</span>
                        <span className="text-green-600">-{formatCurrencyDisplay(discountCents)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Final Amount:</span>
                      <span>{formatCurrencyDisplay(effectiveBillCents)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Credits Earned ({activeCashbackPct}%):</span>
                      <span>+{formatCurrencyDisplay(Math.floor(effectiveBillCents * activeCashbackPct / 100))}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Button onClick={handleRequestPayment} className="w-full" size="lg">
                  Request Payment
                </Button>
                <Button onClick={handleQuickPay} variant="outline" className="w-full">
                  Quick Pay (No Deal)
                </Button>
              </div>

              {/* FIFO Payment Queue */}
              {state.queue.length > 0 && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Payment Queue ({state.queue.length})</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleSimulateIncoming}>
                        Simulate Incoming
                      </Button>
                      {state.queue.length > 0 && !state.currentlyServing && (
                        <Button size="sm" onClick={handleServeNext}>
                          Serve Next (FIFO)
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {state.queue.map((customer, index) => {
                      const isExpired = customer.paymentWindowExpiry && new Date() >= customer.paymentWindowExpiry;
                      const timeLeft = customer.paymentWindowExpiry ? customer.paymentWindowExpiry.getTime() - currentTime.getTime() : 0;
                      const minutesLeft = Math.floor(timeLeft / 60000);
                      const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
                      
                      return (
                        <div
                          key={customer.id}
                          className={`p-3 rounded-lg border ${
                            state.currentlyServing === customer.id
                              ? 'bg-primary/10 border-primary'
                              : isExpired
                              ? 'bg-destructive/10 border-destructive opacity-60'
                              : 'bg-background'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-medium">
                                  {index + 1}
                                </span>
                                <span className="font-bold">{customer.displayName}</span>
                                {state.currentlyServing === customer.id && (
                                  <Badge variant="default" className="text-xs">Currently Serving</Badge>
                                )}
                                {isExpired && (
                                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {customer.deal ? (
                                  <DealBadge 
                                    discountPct={customer.deal.discountPct} 
                                    cashbackPct={customer.deal.cashbackPct}
                                  />
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Default Cashback</Badge>
                                )}
                                <span className="text-sm font-medium">{formatCurrencyDisplay(Math.round(parseFloat(customer.amount) * 100))}</span>
                                <span className="text-xs text-muted-foreground">Code: ••••••</span>
                                {customer.paymentWindowExpiry && timeLeft > 0 && (
                                  <span className="text-xs text-orange-600 font-medium">
                                    ⏰ {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                              {state.currentlyServing === customer.id && (
                                <div className="mt-2 text-sm text-primary font-medium">
                                  💬 Verbal verify: {customer.displayName}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {state.currentlyServing !== customer.id ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleCallNext(customer.id)}
                                  className="h-8"
                                  disabled={isExpired}
                                >
                                  Call
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setState(prev => ({ ...prev, currentlyServing: undefined }))}
                                  className="h-8"
                                >
                                  Done
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSkipCustomer(customer.id)}
                                className="h-8 w-8 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                             </div>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
              )}
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
              {state.selectedDeal && (
                <div className="p-3 bg-muted/50 rounded-lg border mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Deal Used: {state.selectedDeal.title}</span>
                  </div>
                  <DealBadge 
                    discountPct={state.selectedDeal.discountPct} 
                    cashbackPct={state.selectedDeal.cashbackPct}
                  />
                </div>
              )}
              <div className="flex justify-center">
                <QRCodeSVG value={state.qrPayload} size={200} />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrencyDisplay(effectiveBillCents)}</p>
                <p className="text-sm text-muted-foreground">Transaction: {state.txId}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Hash className="w-4 h-4" />
                  <span className="font-mono text-lg font-bold">{state.code6}</span>
                </div>
                <p className="text-xs text-muted-foreground">Manual Code (fallback)</p>
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
              {state.selectedDeal && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Deal Used: {state.selectedDeal.title}</span>
                  </div>
                  <DealBadge 
                    discountPct={state.selectedDeal.discountPct} 
                    cashbackPct={state.selectedDeal.cashbackPct}
                  />
                </div>
              )}
              <div className="text-center">
                <p className="text-2xl font-bold">{formatCurrencyDisplay(effectiveBillCents)}</p>
                <p className="text-sm text-muted-foreground">Transaction: {state.txId}</p>
              </div>
              <Badge variant="secondary" className="w-full justify-center">
                Customer confirming payment...
              </Badge>
            </CardContent>
          </Card>
        );

      case 'awaiting-merchant':
        const totalCreditsUsed = state.selectedLocalCents + state.selectedNetworkCents;
        const currentCustomer = state.queue.find(c => c.id === state.currentlyServing);
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Payment Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="default" className="w-full justify-center">
                Pending Verification
              </Badge>
              <div className="text-center text-sm text-muted-foreground">
                Customer Paid – Waiting for Confirmation
              </div>
              {state.selectedDeal && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Deal Used: {state.selectedDeal.title}</span>
                  </div>
                  <DealBadge 
                    discountPct={state.selectedDeal.discountPct} 
                    cashbackPct={state.selectedDeal.cashbackPct}
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Original Bill:</span>
                  <span className="font-medium">{formatCurrencyDisplay(amountCents)}</span>
                </div>
                {discountCents > 0 && (
                  <div className="flex justify-between">
                    <span>Discount ({discountPct}%):</span>
                    <span className="font-medium text-green-600">-{formatCurrencyDisplay(discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Effective Bill:</span>
                  <span className="font-medium">{formatCurrencyDisplay(effectiveBillCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Local Credits Used:</span>
                  <span className="font-medium">{formatCurrencyDisplay(state.selectedLocalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Credits Used:</span>
                  <span className="font-medium">{formatCurrencyDisplay(state.selectedNetworkCents)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Amount to Collect:</span>
                  <span>{formatCurrencyDisplay(state.balanceCents)}</span>
                </div>
              </div>
              <Button 
                onClick={handleMerchantConfirm} 
                className="w-full" 
                size="lg"
                disabled={(() => {
                  const currentCustomerInQueue = state.queue.find(c => c.id === state.txId);
                  return currentCustomerInQueue?.paymentWindowExpiry && new Date() >= currentCustomerInQueue.paymentWindowExpiry;
                })()}
              >
                {(() => {
                  const currentCustomerInQueue = state.queue.find(c => c.id === state.txId);
                  if (currentCustomerInQueue?.paymentWindowExpiry && new Date() >= currentCustomerInQueue.paymentWindowExpiry) {
                    return "Payment Expired";
                  }
                  return "Confirm Payment";
                })()}
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
              <p>Verifying transaction...</p>
            </CardContent>
          </Card>
        );

      case 'complete':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Payment Verified
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.selectedDeal && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Deal Used: {state.selectedDeal.title}</span>
                  </div>
                  <DealBadge 
                    discountPct={state.selectedDeal.discountPct} 
                    cashbackPct={state.selectedDeal.cashbackPct}
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">{formatCurrencyDisplay(amountCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credits Applied:</span>
                  <span className="font-medium">{formatCurrencyDisplay(state.selectedLocalCents + state.selectedNetworkCents)}</span>
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
    return (
      <div className="space-y-4">
        {/* Compact Identity Pill - Top Right */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1 border">
            <User className="w-3 h-3" />
            <Input
              placeholder="Your name"
              value={displayName}
              onChange={(e) => updateDisplayName(e.target.value)}
              className="text-xs border-0 p-0 h-auto bg-transparent font-medium w-20 text-center"
            />
          </div>
        </div>
        
        {renderCustomerContent()}
      </div>
    );
  };

  const renderCustomerContent = () => {
    switch (state.step) {
      case 'merchant-enter':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Available Deals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show My Grab Pass if active hold */}
              {state.currentHold && state.selectedDeal ? (
                <div className="space-y-4">
                  {/* My Grab Pass Card */}
                  <Card className="border-2 border-primary bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        My Grab Pass
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-bold text-lg">{state.selectedDeal.title}</h4>
                        <p className="text-muted-foreground">{state.selectedDeal.merchantName}</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{state.selectedDeal.address}</span>
                        </div>
                        <div className="mt-2">
                          <DealBadge 
                            discountPct={state.selectedDeal.discountPct} 
                            cashbackPct={state.selectedDeal.cashbackPct}
                          />
                        </div>
                      </div>

                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">PIN:</span>
                          <div className="font-mono text-xl font-bold tracking-wider">{state.currentHold.pin}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Expires:</span>
                          <span className="text-sm text-orange-600 font-medium">
                            {(() => {
                              const timeLeft = state.currentHold.expiresAt.getTime() - currentTime.getTime();
                              const minutesLeft = Math.floor(timeLeft / 60000);
                              const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
                              return `${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`;
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleUseNow} className="flex-1">
                          Use Now
                        </Button>
                        <Button variant="outline" onClick={handleCancelHold}>
                          Cancel Hold
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-center text-sm text-muted-foreground">
                    Ready to pay at merchant with this deal
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Browse and grab deals to use during payment
                  </p>

                  {/* Show rate limiting status */}
                  {(() => {
                    const cooldownExpiry = getCooldownExpiry();
                    if (cooldownExpiry && new Date() < cooldownExpiry) {
                      const remainingMs = cooldownExpiry.getTime() - currentTime.getTime();
                      const remainingMins = Math.floor(remainingMs / 60000);
                      const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
                      
                      return (
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive">
                          <div className="text-center">
                            <p className="text-sm font-medium text-destructive">Too Many Grab Attempts</p>
                            <p className="text-xs text-destructive">
                              Cooldown: {remainingMins}:{remainingSecs.toString().padStart(2, '0')} remaining
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    const recentAttempts = getRecentAttempts();
                    const attemptsLeft = Math.max(0, MAX_GRAB_ATTEMPTS - recentAttempts.length);
                    
                    if (attemptsLeft <= 1 && attemptsLeft > 0) {
                      return (
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="text-center">
                            <p className="text-sm font-medium text-orange-600">
                              {attemptsLeft} grab attempt remaining
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  {/* No-show warning */}
                  {state.noShowCount > 0 && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-center">
                        <p className="text-sm font-medium text-orange-600">
                          ⚠️ {state.noShowCount} no-show{state.noShowCount > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-orange-600">
                          Please complete payments within the time window
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Default Cashback - Made Prominent */}
                  <Card className="border-4 border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Store className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-primary mb-1">💳 SCAN NOW FOR PAYMENT</h4>
                          <p className="text-sm font-medium text-primary/80 mb-2">Instant cashback - no deal required</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-primary text-primary-foreground text-xs px-2 py-1">
                              {merchantDefaultCashbackPct}% CASHBACK
                            </Badge>
                            <span className="text-xs text-primary/70 font-semibold">⚡ INSTANT REWARD</span>
                          </div>
                        </div>
                        <Button 
                          onClick={handleSkipDeals}
                          size="default"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 font-bold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                        >
                          🚀 PAY NOW
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-center text-sm text-muted-foreground">
                    — OR choose a special deal below —
                  </div>

                  <div className="space-y-3">
                    {mockDeals.map((deal) => (
                      <Card key={deal.id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Store className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{deal.title}</h4>
                              <p className="text-xs text-muted-foreground truncate">{deal.merchantName}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">{deal.address}</span>
                              </div>
                              <div className="mt-2">
                                <DealBadge 
                                  discountPct={deal.discountPct} 
                                  cashbackPct={deal.cashbackPct} 
                                />
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleGrabDeal(deal)}
                              size="sm"
                              variant="outline"
                              disabled={isRateLimited()}
                            >
                              Grab
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );

      case 'grab-deal':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Customer App
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Browse and grab deals to use during payment
              </p>

              {/* Show current hold status */}
              {state.currentHold && state.selectedDeal && (
                <div className="space-y-4">
                  {/* My Grab Pass Card */}
                  <Card className="border-2 border-primary bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        My Grab Pass
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-bold text-lg">{state.selectedDeal.title}</h4>
                        <p className="text-muted-foreground">{state.selectedDeal.merchantName}</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{state.selectedDeal.address}</span>
                        </div>
                        <div className="mt-2">
                          <DealBadge 
                            discountPct={state.selectedDeal.discountPct} 
                            cashbackPct={state.selectedDeal.cashbackPct}
                          />
                        </div>
                      </div>

                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">PIN:</span>
                          <div className="font-mono text-xl font-bold tracking-wider">{state.currentHold.pin}</div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Expires:</span>
                          <span className="text-sm text-orange-600 font-medium">
                            {(() => {
                              const timeLeft = state.currentHold.expiresAt.getTime() - currentTime.getTime();
                              const minutesLeft = Math.floor(timeLeft / 60000);
                              const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
                              return `${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`;
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={handleUseNow} className="flex-1">
                          Use Now
                        </Button>
                        <Button variant="outline" onClick={handleCancelHold}>
                          Cancel Hold
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-center text-sm text-muted-foreground">
                    Go to merchant to process payment with this deal
                  </div>
                </div>
              )}

              {/* Available Deals - disabled if hold active */}
              {!state.currentHold && (
                <>
                  {/* Rate limiting status */}
                  {(() => {
                    const cooldownExpiry = getCooldownExpiry();
                    if (cooldownExpiry && new Date() < cooldownExpiry) {
                      const remainingMs = cooldownExpiry.getTime() - currentTime.getTime();
                      const remainingMins = Math.floor(remainingMs / 60000);
                      const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
                      
                      return (
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive">
                          <div className="text-center">
                            <p className="text-sm font-medium text-destructive">Too Many Grab Attempts</p>
                            <p className="text-xs text-destructive">
                              Cooldown: {remainingMins}:{remainingSecs.toString().padStart(2, '0')} remaining
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    const recentAttempts = getRecentAttempts();
                    const attemptsLeft = Math.max(0, MAX_GRAB_ATTEMPTS - recentAttempts.length);
                    
                    if (attemptsLeft <= 1 && attemptsLeft > 0) {
                      return (
                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <div className="text-center">
                            <p className="text-sm font-medium text-orange-600">
                              {attemptsLeft} grab attempt remaining
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  {/* No-show warning */}
                  {state.noShowCount > 0 && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-center">
                        <p className="text-sm font-medium text-orange-600">
                          ⚠️ {state.noShowCount} no-show{state.noShowCount > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-orange-600">
                          Please complete payments within the time window
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Default Cashback */}
                  <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
                          <Store className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-green-700 dark:text-green-300">Default Cashback</h4>
                          <p className="text-sm text-green-600 dark:text-green-400">No deal required - instant reward</p>
                          <div className="mt-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {merchantDefaultCashbackPct}% cashback
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          onClick={handleSkipDeals}
                          size="lg"
                          className="bg-green-600 hover:bg-green-700 text-white px-6"
                        >
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-center text-sm text-muted-foreground">
                    — OR choose a special deal below —
                  </div>

                  <div className="space-y-3">
                    {mockDeals.map((deal) => (
                      <Card key={deal.id} className="border hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Store className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{deal.title}</h4>
                              <p className="text-xs text-muted-foreground truncate">{deal.merchantName}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">{deal.address}</span>
                              </div>
                              <div className="mt-2">
                                <DealBadge 
                                  discountPct={deal.discountPct} 
                                  cashbackPct={deal.cashbackPct} 
                                />
                              </div>
                            </div>
                            <Button 
                              onClick={() => handleGrabDeal(deal)}
                              size="sm"
                              variant="outline"
                              disabled={isRateLimited()}
                            >
                              Grab
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );

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

              {state.selectedDeal && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Deal Ready</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{state.selectedDeal.title}</p>
                    <p className="text-muted-foreground">{state.selectedDeal.merchantName}</p>
                    <div className="mt-2">
                      <DealBadge 
                        discountPct={state.selectedDeal.discountPct} 
                        cashbackPct={state.selectedDeal.cashbackPct}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="text-center space-y-4">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Scan & Pay</h3>
                  <p className="text-sm text-muted-foreground">
                    {state.selectedDeal ? 
                      `Ready to use your deal at ${state.selectedDeal.merchantName}` :
                      "Scan merchant QR code to proceed"
                    }
                  </p>
                </div>
                {state.step === 'qr-generated' && (
                  <>
                    <Button onClick={handleSimulateScan} variant="outline" className="w-full">
                      Simulate QR Scan
                    </Button>
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Or enter 6-digit code manually:</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="000000"
                          value={state.manualCodeInput}
                          onChange={(e) => setState(prev => ({ ...prev, manualCodeInput: e.target.value }))}
                          maxLength={6}
                          className="text-center font-mono"
                        />
                        <Button onClick={handleManualCodeEntry} variant="outline" size="sm">
                          Enter Code
                        </Button>
                      </div>
                    </div>
                  </>
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

              {state.selectedDeal && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Using Deal: {state.selectedDeal.title}</span>
                  </div>
                  <DealBadge 
                    discountPct={state.selectedDeal.discountPct} 
                    cashbackPct={state.selectedDeal.cashbackPct}
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Total Bill:</span>
                  <span className="font-bold">{formatCurrencyDisplay(amountCents)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>{state.applyCredits ? 'Apply Credits' : 'Pay Full Amount'}</span>
                  <Switch 
                    checked={state.applyCredits} 
                    onCheckedChange={handleToggleCredits}
                  />
                </div>

                {state.applyCredits && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Local Credits Applied:</span>
                      <span>{formatCurrencyDisplay(state.selectedLocalCents)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Network Credits Applied:</span>
                      <span>{formatCurrencyDisplay(state.selectedNetworkCents)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Auto-applied: local first, then network</p>
                  </div>
                )}

                <Separator />
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Credits Used:</span>
                    <span>{state.applyCredits ? formatCurrencyDisplay(totalCreditsSelected) : "$0.00"}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Balance to Pay:</span>
                    <span>{formatCurrencyDisplay(state.applyCredits ? state.balanceCents : amountCents)}</span>
                  </div>
                </div>
              </div>

              <Button onClick={handleConfirmPayment} className="w-full" size="lg">
                Confirm & Pay
              </Button>
            </CardContent>
          </Card>
        );

      case 'awaiting-merchant':
        const creditsUsed = state.selectedLocalCents + state.selectedNetworkCents;
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Payment Submitted
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {state.selectedDeal && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Deal Applied: {state.selectedDeal.title}</span>
                  </div>
                  <DealBadge 
                    discountPct={state.selectedDeal.discountPct} 
                    cashbackPct={state.selectedDeal.cashbackPct}
                  />
                </div>
              )}
              <Badge variant="secondary" className="w-full justify-center">
                Waiting for Merchant Confirmation
              </Badge>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Bill:</span>
                  <span className="font-medium">{formatCurrencyDisplay(amountCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credits Used:</span>
                  <span className="font-medium">{formatCurrencyDisplay(creditsUsed)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Balance to Pay:</span>
                  <span>{formatCurrencyDisplay(state.balanceCents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'processing':
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Processing Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="text-center space-y-4">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p>Please wait while we process your payment...</p>
              </div>
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

              {state.selectedDeal && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Deal Used: {state.selectedDeal.title}</span>
                  </div>
                  <DealBadge 
                    discountPct={state.selectedDeal.discountPct} 
                    cashbackPct={state.selectedDeal.cashbackPct}
                  />
                </div>
              )}
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
                  <span className="font-medium">{formatCurrencyDisplay(state.creditsEarnedCents)}</span>
                </div>
              </div>
              <Badge variant="secondary" className="w-full justify-center">
                {activeCashbackPct}% cashback earned
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
          <h1 className="text-3xl font-bold mb-2">Grab Deal & Pay Demo</h1>
          <Badge variant="outline">Demo Mode - Grab → Payment → Validation Flow</Badge>
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