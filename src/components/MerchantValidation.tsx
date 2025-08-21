import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, XCircle, Camera, Scan, QrCode, Radio, RefreshCw, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

interface MerchantValidationProps {
  merchantId: string;
}

interface ValidationResult {
  success: boolean;
  amount: number;
  customerName: string;
  merchantName: string;
  message: string;
}

interface Transaction {
  id: string;
  payment_code: string;
  original_amount: number;
  final_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  authorized_at?: string;
  captured_at?: string;
  voided_at?: string;
  expires_at: string;
  local_credits_used: number;
  network_credits_used: number;
}

export default function MerchantValidation({ merchantId }: MerchantValidationProps) {
  const [validationCode, setValidationCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationMode, setValidationMode] = useState<'payment' | 'grab'>('payment');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [authorizedTransactions, setAuthorizedTransactions] = useState<Transaction[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [oneTapMode, setOneTapMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingTransactions();
    loadRecentTransactions();
    loadAuthorizedTransactions();
    startLiveUpdates();
    
    return () => stopLiveUpdates();
  }, [merchantId]);

  const startLiveUpdates = () => {
    setIsListening(true);
    
    const channel = supabase
      .channel('merchant-transactions')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'pending_transactions',
        filter: `merchant_id=eq.${merchantId}`
      }, (payload) => {
        console.log('New transaction:', payload);
        loadPendingTransactions();
        
        toast({
          title: "New Payment Generated",
          description: `Code: ${payload.new.payment_code}`,
        });
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'pending_transactions',
        filter: `merchant_id=eq.${merchantId}`
      }, (payload) => {
        console.log('Transaction updated:', payload);
        if (payload.new.status === 'authorized') {
          loadAuthorizedTransactions();
          loadPendingTransactions();
          
          toast({
            title: "Payment Authorized",
            description: `Transaction ${payload.new.payment_code} awaiting cash collection`,
          });
        } else if (payload.new.status === 'validated' || payload.new.status === 'completed') {
          loadRecentTransactions();
          loadAuthorizedTransactions();
          
          toast({
            title: "Payment Completed",
            description: `Transaction ${payload.new.payment_code} completed`,
          });
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'merchant_notifications',
        filter: `merchant_id=eq.${merchantId}`
      }, (payload) => {
        console.log('Merchant notification:', payload);
        const notification = payload.new;
        if (notification.type === 'PAYMENT_AUTHORIZED') {
          toast({
            title: "💰 Payment Authorized",
            description: "Awaiting cash collection from customer",
          });
        } else if (notification.type === 'PAYMENT_VALIDATED') {
          toast({
            title: "💰 Payment Received",
            description: "Payment completed successfully",
          });
        }
      })
      .subscribe();
  };

  const stopLiveUpdates = () => {
    setIsListening(false);
    supabase.removeAllChannels();
  };

  const loadPendingTransactions = async () => {
    if (!merchantId) return;
    
    const { data, error } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error loading pending transactions:', error);
    } else {
      setPendingTransactions(data || []);
    }
  };

  const loadAuthorizedTransactions = async () => {
    if (!merchantId) return;
    
    const { data, error } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('status', 'authorized')
      .order('authorized_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error loading authorized transactions:', error);
    } else {
      setAuthorizedTransactions(data || []);
    }
  };

  const loadRecentTransactions = async () => {
    if (!merchantId) return;
    
    const { data, error } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('merchant_id', merchantId)
      .in('status', ['validated', 'completed'])
      .order('updated_at', { ascending: false })
      .limit(10);
      
    if (error) {
      console.error('Error loading recent transactions:', error);
    } else {
      setRecentTransactions(data || []);
    }
  };

  const handleValidation = async () => {
    if (validationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    
    try {
      if (validationMode === 'payment') {
        const { data, error } = await supabase.functions.invoke('validatePendingTransaction', {
          body: { 
            paymentCode: validationCode,
            merchantId: merchantId,
            captureNow: oneTapMode
          }
        });

        if (error) throw error;

        if (data.success) {
          const isAwaitingConfirmation = data.data?.awaitingConfirmation;
          const isCompleted = !isAwaitingConfirmation;
          
          setValidationResult({
            success: true,
            amount: data.data?.originalAmount || 0,
            customerName: "Anonymous Customer",
            merchantName: data.data?.merchantName || "Your Store",
            message: isCompleted 
              ? "Payment completed successfully!" 
              : "Payment authorized - awaiting cash collection"
          });
          
          toast({
            title: isCompleted ? "Payment Completed!" : "Payment Authorized",
            description: isCompleted 
              ? "Transaction completed and credits awarded" 
              : "Awaiting cash collection from customer",
          });
          
          // Reload transactions to show updated status
          loadPendingTransactions();
          loadAuthorizedTransactions();
          loadRecentTransactions();
        } else {
          setValidationResult({
            success: false,
            amount: 0,
            customerName: "",
            merchantName: "",
            message: data.error || "Validation failed"
          });
          
          toast({
            title: "Validation Failed",
            description: data.error || "Invalid payment code",
            variant: "destructive"
          });
        }
      } else {
        // Grab PIN validation
        const { data, error } = await supabase.functions.invoke('useGrab', {
          body: { 
            pin: validationCode,
            paymentCode: 'DISCOUNT_REDEEMED'
          }
        });

        if (error) throw error;

        if (data.success) {
          const transaction = data.data;
          
          setValidationResult({
            success: true,
            amount: transaction.original_amount || 0,
            customerName: "Anonymous Customer",
            merchantName: "Your Store",
            message: "Grab validated successfully!"
          });
          
          toast({
            title: "Grab Validation Successful",
            description: "Deal has been redeemed",
          });
          
          // Reload transactions
          loadPendingTransactions();
          loadAuthorizedTransactions();
          loadRecentTransactions();
        } else {
          setValidationResult({
            success: false,
            amount: 0,
            customerName: "",
            merchantName: "",
            message: data.error || "Invalid PIN or already used"
          });
          
          toast({
            title: "Validation Failed",
            description: data.error || "Invalid PIN or already used",
            variant: "destructive"
          });
        }
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      setValidationResult({ 
        success: false, 
        amount: 0,
        customerName: "",
        merchantName: "",
        message: "An unexpected error occurred" 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const resetValidation = () => {
    setValidationResult(null);
    setValidationCode('');
  };

  const confirmCashCollection = async (paymentCode: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('confirmCashCollection', {
        body: { paymentCode, merchantId }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Cash Collection Confirmed",
          description: "Transaction completed successfully",
        });
        
        loadAuthorizedTransactions();
        loadRecentTransactions();
      }
    } catch (error) {
      console.error('Error confirming cash collection:', error);
      toast({
        title: "Error",
        description: "Failed to confirm cash collection",
        variant: "destructive"
      });
    }
  };

  const voidTransaction = async (paymentCode: string, reason?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('voidPendingTransaction', {
        body: { paymentCode, merchantId, reason }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Transaction Voided",
          description: "Transaction has been cancelled",
        });
        
        loadAuthorizedTransactions();
        loadPendingTransactions();
      }
    } catch (error) {
      console.error('Error voiding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to void transaction",
        variant: "destructive"
      });
    }
  };

  if (validationResult) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card>
          <CardContent className="pt-8">
            <div className="text-center space-y-6">
              {validationResult.success ? (
                <>
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
                  
                  <div>
                    <h1 className="text-3xl font-bold text-green-600">
                      Success ✓
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                      {validationResult.message}
                    </p>
                  </div>
                  
                  <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Customer:</span>
                          <span className="font-semibold">{validationResult.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-semibold">${(validationResult.amount / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <XCircle className="w-20 h-20 text-red-500 mx-auto" />
                  
                  <div>
                    <h1 className="text-3xl font-bold text-red-600">
                      Failed ✗
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                      {validationResult.message}
                    </p>
                  </div>
                </>
              )}
              
              <Button onClick={resetValidation} className="w-full" size="lg">
                Validate Another Code
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card className="border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className={`w-4 h-4 ${isListening ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
            Payment Validation System
            <Badge variant={isListening ? "default" : "secondary"} className="text-xs">
              {isListening ? "Live" : "Offline"}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="validate" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingTransactions.length})</TabsTrigger>
          <TabsTrigger value="authorized">
            Awaiting Cash ({authorizedTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="recent">Recent ({recentTransactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="validate" className="space-y-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="w-5 h-5" />
                Manual Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Toggle */}
              <div className="space-y-3">
                {/* Mode Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    variant={validationMode === 'payment' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setValidationMode('payment');
                      setValidationCode('');
                    }}
                    className="flex-1"
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Payment Code
                  </Button>
                  <Button
                    variant={validationMode === 'grab' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setValidationMode('grab');
                      setValidationCode('');
                    }}
                    className="flex-1"
                  >
                    <QrCode className="w-4 h-4 mr-1" />
                    Deal PIN
                  </Button>
                </div>

                {/* One-Tap Mode Toggle */}
                {validationMode === 'payment' && (
                  <div className="flex items-center justify-between space-x-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="space-y-1">
                      <Label htmlFor="one-tap-mode" className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        One-Tap Complete
                      </Label>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Complete cash payments in one step (scan & confirm together)
                      </p>
                    </div>
                    <Switch
                      id="one-tap-mode"
                      checked={oneTapMode}
                      onCheckedChange={setOneTapMode}
                    />
                  </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold">
                  {validationMode === 'payment' ? 'Validate Payment Code' : 'Redeem Deal PIN'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {validationMode === 'payment' 
                    ? 'Enter the 6-digit payment code from customer'
                    : 'Enter the 6-digit PIN from customer\'s QR code'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="validationCode">
                    {validationMode === 'payment' ? 'Payment Code' : 'Deal PIN'}
                  </Label>
                  <Input
                    id="validationCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={validationCode}
                    onChange={(e) => setValidationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl font-mono tracking-wider"
                    maxLength={6}
                  />
                </div>

                <Button
                  onClick={handleValidation}
                  disabled={validationCode.length !== 6 || isValidating}
                  className="w-full"
                  size="lg"
                >
                  {isValidating 
                    ? "Processing..." 
                    : validationMode === 'payment' 
                      ? (oneTapMode ? "Scan & Complete Payment" : "Validate Payment")
                      : "Redeem Deal"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Transactions waiting for validation
          </div>
          
          {pendingTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending transactions
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTransactions.map((transaction) => (
                <Card key={transaction.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-medium text-lg">
                        {transaction.payment_code}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${(transaction.original_amount / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setValidationCode(transaction.payment_code);
                        handleValidation();
                      }}
                    >
                      Validate
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="authorized" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Transactions authorized and awaiting cash collection
          </div>
          
          {authorizedTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions awaiting cash collection
            </div>
          ) : (
            <div className="space-y-2">
              {authorizedTransactions.map((transaction) => (
                <Card key={transaction.id} className="p-4 border-orange-200 bg-orange-50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium text-lg text-orange-800">
                          Code: {transaction.payment_code}
                        </div>
                        <div className="text-lg font-bold text-orange-900">
                          COLLECT: ${(transaction.final_amount / 100).toFixed(2)}
                        </div>
                        <div className="text-sm text-orange-700">
                          Authorized {formatDistanceToNow(new Date(transaction.authorized_at || transaction.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-orange-600 mb-1">
                          Expires in {Math.max(0, Math.floor((new Date(transaction.expires_at).getTime() - Date.now()) / 60000))} min
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => confirmCashCollection(transaction.payment_code)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        ✓ Confirm Collected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => voidTransaction(transaction.payment_code, "Customer did not pay")}
                        className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        ✗ Void
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Recently completed transactions
          </div>
          
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent transactions
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((transaction) => (
                <Card key={transaction.id} className="p-4 bg-green-50 border-green-200">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-medium text-lg">
                        {transaction.payment_code}
                      </div>
                      <div className="text-sm text-green-700">
                        ${(transaction.original_amount / 100).toFixed(2)} • 
                        {transaction.status === 'completed' ? ' Cash Collected' : ' Card Payment'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(transaction.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="text-green-600 font-medium">
                      ✓ Complete
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}