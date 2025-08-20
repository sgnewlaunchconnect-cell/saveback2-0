import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Camera, Scan } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  }, []);

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Hawker Validation
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