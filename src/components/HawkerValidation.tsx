import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Camera, Scan, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function HawkerValidation() {
  const [validationCode, setValidationCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationMode, setValidationMode] = useState<'payment' | 'grab'>('payment');
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    billAmount?: number;
    creditsAwarded?: number;
    transactionReference?: string;
    customerName?: string;
    merchantName?: string;
    dealTitle?: string;
    discountPct?: number;
    message?: string;
  } | null>(null);
  const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Auto-fill code from URL params if provided
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    const modeParam = urlParams.get('mode');
    
    if (codeParam && codeParam.length === 6) {
      setValidationCode(codeParam);
    }
    
    if (modeParam === 'payment' || modeParam === 'grab') {
      setValidationMode(modeParam);
    }

    // Start listening for real-time updates
    startLiveUpdates();
    
    return () => {
      stopLiveUpdates();
    };
  }, []);

  const startLiveUpdates = () => {
    setIsListening(true);
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_transactions',
          filter: 'status=eq.validated'
        },
        (payload) => {
          const transaction = payload.new;
          setLiveTransactions(prev => [transaction, ...prev.slice(0, 4)]); // Keep last 5
          toast.success(`Payment validated: ₹${(transaction.original_amount / 100).toFixed(2)}`);
        }
      )
      .subscribe();

    // Load recent validated transactions
    loadRecentTransactions();
  };

  const stopLiveUpdates = () => {
    setIsListening(false);
    supabase.removeAllChannels();
  };

  const loadRecentTransactions = async () => {
    try {
      const { data } = await supabase
        .from('pending_transactions')
        .select('*')
        .eq('status', 'validated')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setLiveTransactions(data);
      }
    } catch (error) {
      console.error('Error loading recent transactions:', error);
    }
  };

  const handleValidation = async () => {
    if (validationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsValidating(true);
    
    try {
      if (validationMode === 'payment') {
        // Existing payment validation logic
        const { data, error } = await supabase.functions.invoke('validatePendingTransaction', {
          body: { paymentCode: validationCode }
        });

        if (error) {
          console.error('Validation error:', error);
          toast.error("Validation failed. Please try again.");
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
            merchantName: data.data.merchantName
          });
          toast.success("Payment validated successfully!");
        } else {
          setValidationResult({
            success: false,
            message: data.error || "Invalid code or code has expired"
          });
          toast.error(data.error || "Validation failed");
        }
      } else {
        // New grab PIN validation logic
        const { data, error } = await supabase.functions.invoke('useGrab', {
          body: { 
            pin: validationCode,
            paymentCode: 'DISCOUNT_REDEEMED'
          }
        });

        if (error) {
          console.error('Grab validation error:', error);
          toast.error("Validation failed. Please try again.");
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
            merchantName: data.data.merchantName || "Your Store"
          });
          toast.success("Grab pass validated successfully!");
        } else {
          setValidationResult({
            success: false,
            message: data.error || "Invalid PIN or already used"
          });
          toast.error(data.error || "Validation failed");
        }
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      toast.error("Validation failed. Please try again.");
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
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
                      Credits Released Successfully
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
                          <span>Merchant:</span>
                          <span className="font-semibold">{validationResult.merchantName}</span>
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
      {/* Live Updates Section */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className={`w-4 h-4 ${isListening ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
            Live Payment Updates
            <Badge variant={isListening ? "default" : "secondary"} className="text-xs">
              {isListening ? "Live" : "Offline"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {liveTransactions.length > 0 ? (
            <>
              {liveTransactions.map((transaction, index) => (
                <div key={transaction.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                  <div>
                    <span className="font-medium">₹{(transaction.original_amount / 100).toFixed(2)}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(transaction.updated_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">Validated</Badge>
                </div>
              ))}
              <Button 
                onClick={loadRecentTransactions} 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Waiting for new payments...
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Manual Validation Section */}
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
              Grab PIN
            </Button>
          </div>

          <div className="text-center space-y-2">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">
              {validationMode === 'payment' ? 'Validate Payment Code' : 'Redeem Grab PIN'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {validationMode === 'payment' 
                ? 'Enter the 6-digit payment code shown by customer'
                : 'Enter the 6-digit grab PIN from customer\'s pass'
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
                  : "Redeem Grab Pass"
              }
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Demo Mode: Generate codes at /customer/validate
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}