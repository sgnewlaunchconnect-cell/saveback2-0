import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Camera, Scan, QrCode, Radio, RefreshCw, Clock, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MerchantValidationProps {
  merchantId: string;
}

interface ValidationResult {
  success: boolean;
  billAmount?: number;
  creditsAwarded?: number;
  transactionReference?: string;
  customerName?: string;
  merchantName?: string;
  dealTitle?: string;
  discountPct?: number;
  message?: string;
  paymentChannel?: string;
}

interface Transaction {
  id: string;
  payment_code: string;
  original_amount: number;
  final_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
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
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingTransactions();
    loadRecentTransactions();
    startLiveUpdates();
    
    return () => {
      stopLiveUpdates();
    };
  }, [merchantId]);

  const startLiveUpdates = () => {
    setIsListening(true);
    
    const channel = supabase
      .channel('merchant-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_transactions',
          filter: `merchant_id=eq.${merchantId}`
        },
        (payload) => {
          const transaction = payload.new as Transaction;
          setPendingTransactions(prev => [transaction, ...prev]);
          toast({
            title: "New Payment Code Generated",
            description: `Code: ${transaction.payment_code} - $${(transaction.original_amount / 100).toFixed(2)}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_transactions',
          filter: `merchant_id=eq.${merchantId}`
        },
        (payload) => {
          const transaction = payload.new as Transaction;
          if (transaction.status === 'validated') {
            setPendingTransactions(prev => prev.filter(t => t.id !== transaction.id));
            setRecentTransactions(prev => [transaction, ...prev.slice(0, 9)]);
            toast({
              title: "Payment Validated",
              description: `$${(transaction.original_amount / 100).toFixed(2)} transaction completed`,
            });
          }
        }
      )
      .subscribe();
  };

  const stopLiveUpdates = () => {
    setIsListening(false);
    supabase.removeAllChannels();
  };

  const loadPendingTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPendingTransactions(data || []);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('status', 'validated')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentTransactions(data || []);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
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
          body: { paymentCode: validationCode }
        });

        if (error) {
          console.error('Validation error:', error);
          toast({
            title: "Validation Failed",
            description: "Network error occurred. Please try again.",
            variant: "destructive",
          });
          setValidationResult({ 
            success: false, 
            message: "Network error occurred" 
          });
          return;
        }

        if (data.success) {
          setValidationResult({
            success: true,
            billAmount: data.data.originalAmount / 100,
            creditsAwarded: data.data.totalCredits / 100,
            transactionReference: data.data.transactionId,
            customerName: "Customer",
            merchantName: data.data.merchantName,
            paymentChannel: "Payment Code"
          });
          toast({
            title: "Payment Validated",
            description: "Credits released successfully!",
          });
          loadPendingTransactions();
          loadRecentTransactions();
        } else {
          setValidationResult({
            success: false,
            message: data.error || "Invalid code or code has expired"
          });
          toast({
            title: "Validation Failed",
            description: data.error || "Invalid or expired code",
            variant: "destructive",
          });
        }
      } else {
        const { data, error } = await supabase.functions.invoke('useGrab', {
          body: { 
            pin: validationCode,
            paymentCode: 'DISCOUNT_REDEEMED'
          }
        });

        if (error) {
          console.error('Grab validation error:', error);
          toast({
            title: "Validation Failed",
            description: "Network error occurred. Please try again.",
            variant: "destructive",
          });
          setValidationResult({ 
            success: false, 
            message: "Network error occurred" 
          });
          return;
        }

        if (data.success) {
          setValidationResult({
            success: true,
            dealTitle: data.data.dealTitle || "Deal",
            discountPct: data.data.discountPct || 0,
            customerName: "Customer",
            merchantName: data.data.merchantName || "Your Store",
            paymentChannel: "QR Code"
          });
          toast({
            title: "Deal Redeemed",
            description: "Grab pass validated successfully!",
          });
        } else {
          setValidationResult({
            success: false,
            message: data.error || "Invalid PIN or already used"
          });
          toast({
            title: "Validation Failed",
            description: data.error || "Invalid PIN or already used",
            variant: "destructive",
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
        message: "An unexpected error occurred" 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const resetValidation = () => {
    setValidationResult(null);
    setValidationCode("");
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
                      Validated ✓
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                      {validationMode === 'payment' ? 'Credits Released Successfully' : 'Deal Applied Successfully'}
                    </p>
                  </div>
                  
                  <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Channel:</span>
                          <Badge variant="outline">{validationResult.paymentChannel}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Customer:</span>
                          <span className="font-semibold">{validationResult.customerName}</span>
                        </div>
                        {validationMode === 'payment' ? (
                          <>
                            <div className="flex justify-between">
                              <span>Bill Amount:</span>
                              <span className="font-semibold">${validationResult.billAmount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>Credits Awarded:</span>
                              <span className="font-semibold">+${validationResult.creditsAwarded}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Transaction Ref:</span>
                              <span>{validationResult.transactionReference}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span>Deal:</span>
                              <span className="font-semibold">{validationResult.dealTitle}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>Discount Applied:</span>
                              <span className="font-semibold">{validationResult.discountPct}% OFF</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <XCircle className="w-20 h-20 text-red-500 mx-auto" />
                  
                  <div>
                    <h1 className="text-3xl font-bold text-red-600">
                      Invalid ✗
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                      {validationResult.message}
                    </p>
                  </div>
                  
                  <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-red-700 font-medium">
                        Ask customer to regenerate a new code
                      </p>
                    </CardContent>
                  </Card>
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
      <Card className="border-green-200 dark:border-green-800">
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="validate">Validate Code</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingTransactions.length})</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
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
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <Button
                  variant={validationMode === 'payment' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setValidationMode('payment');
                    setValidationCode('');
                    setValidationResult(null);
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
                    setValidationResult(null);
                  }}
                  className="flex-1"
                >
                  <QrCode className="w-4 h-4 mr-1" />
                  QR Deal
                </Button>
              </div>

              <div className="text-center space-y-2">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold">
                  {validationMode === 'payment' ? 'Validate Payment Code' : 'Redeem QR Deal'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {validationMode === 'payment' 
                    ? 'Enter the 6-digit payment code shown by customer'
                    : 'Enter the 6-digit grab PIN from customer\'s QR code'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="validationCode">
                    {validationMode === 'payment' ? 'Customer Payment Code' : 'Customer Grab PIN'}
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
                    ? "Validating..." 
                    : validationMode === 'payment' 
                      ? "Validate & Release Credits" 
                      : "Redeem Deal"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pending Payment Codes</span>
                <Button onClick={loadPendingTransactions} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTransactions.length > 0 ? (
                <div className="space-y-3">
                  {pendingTransactions.map((transaction) => (
                    <Card key={transaction.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-lg font-bold">{transaction.payment_code}</div>
                            <div className="text-sm text-muted-foreground">
                              ${(transaction.original_amount / 100).toFixed(2)}
                              {transaction.local_credits_used > 0 && (
                                <span className="text-green-600 ml-2">
                                  -${(transaction.local_credits_used / 100).toFixed(2)} credits
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">Pending</Badge>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(transaction.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pending payment codes
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Validations</span>
                <Button onClick={loadRecentTransactions} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <Card key={transaction.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-lg font-bold">{transaction.payment_code}</div>
                            <div className="text-sm text-muted-foreground">
                              ${(transaction.original_amount / 100).toFixed(2)}
                              {transaction.local_credits_used > 0 && (
                                <span className="text-green-600 ml-2">
                                  -${(transaction.local_credits_used / 100).toFixed(2)} credits
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="default" className="bg-green-500">Validated</Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(transaction.updated_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent validations
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}