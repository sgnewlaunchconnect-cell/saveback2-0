import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, XCircle, Camera, Scan, QrCode, Radio, RefreshCw, Clock, DollarSign, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import MerchantValidationSimulator from "./MerchantValidationSimulator";
import { MerchantCollectCashSimulator } from "./MerchantCollectCashSimulator";
import { MerchantCompletedSimulator } from "./MerchantCompletedSimulator";

interface MerchantValidationProps {
  merchantId: string;
  isStaffTerminal?: boolean;
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


export default function MerchantValidation({ merchantId, isStaffTerminal = false }: MerchantValidationProps) {
  const [validationCode, setValidationCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationMode, setValidationMode] = useState<'payment' | 'grab'>('payment');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [authorizedTransactions, setAuthorizedTransactions] = useState<Transaction[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [oneTapMode, setOneTapMode] = useState(true); // Always enabled for simple mode
  const [showSimulator, setShowSimulator] = useState(false);
  const [showCollectSimulator, setShowCollectSimulator] = useState(false);
  const [showCompletedSimulator, setShowCompletedSimulator] = useState(false);
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
        console.debug('New transaction:', payload);
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
        console.debug('Transaction updated:', payload);
        if (payload.new.status === 'validated') {
          loadAuthorizedTransactions();
          loadPendingTransactions();
          
          toast({
            title: "Payment Validated",
            description: `Code ${payload.new.payment_code} - collect ₹${(payload.new.final_amount / 100).toFixed(2)} cash`,
          });
        } else if (payload.new.status === 'completed') {
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
        console.debug('Merchant notification:', payload);
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
      .eq('status', 'validated')
      .order('updated_at', { ascending: false })
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
      .eq('status', 'completed')
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
                           <span className="font-semibold">₹{(validationResult.amount / 100).toFixed(2)}</span>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="validate">Validate</TabsTrigger>
          <TabsTrigger value="recent">Completed ({recentTransactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="validate" className="space-y-4">
          {/* Preview Merchant Flow Button */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Eye className="w-5 h-5" />
                Payment Flow Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-700 mb-4">
                See how the merchant validation process works step-by-step
              </p>
              <Button
                onClick={() => setShowSimulator(true)}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Merchant Flow
              </Button>
            </CardContent>
          </Card>

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

                {/* Simple Mode Info */}
                {validationMode === 'payment' && (
                  <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                      ✓ One-Tap Complete Mode Enabled
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Cash payments will be completed instantly upon validation
                    </p>
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


        <TabsContent value="recent" className="space-y-4">
          {/* Completed Flow Preview */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Eye className="w-5 h-5" />
                Completed Flow Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-700 mb-4">
                See how completed payments look step-by-step
              </p>
              <Button
                onClick={() => setShowCompletedSimulator(true)}
                variant="outline"
                className="w-full border-green-300 text-green-700 hover:bg-green-100"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview Completed Flow
              </Button>
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground">
            Successfully completed transactions
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
                         ₹{(transaction.original_amount / 100).toFixed(2)} • Cash Collected
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

      {/* Merchant Validation Simulator */}
      <MerchantValidationSimulator
        open={showSimulator}
        onOpenChange={setShowSimulator}
      />
      
      {/* Collect Cash Simulator */}
      <MerchantCollectCashSimulator
        open={showCollectSimulator}
        onOpenChange={setShowCollectSimulator}
      />
      
      {/* Completed Simulator */}
      <MerchantCompletedSimulator
        open={showCompletedSimulator}
        onOpenChange={setShowCompletedSimulator}
      />
    </div>
  );
}