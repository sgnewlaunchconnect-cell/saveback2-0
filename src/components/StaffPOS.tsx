import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Flashlight, Delete, Check, X, AlertTriangle } from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parsePaymentCode } from "@/utils/qrParsing";

interface ConfirmationData {
  originalAmount: number;
  finalAmount: number;
  creditsApplied: number;
  creditsToIssue: number;
  merchantName: string;
  paymentCode: string;
}

export default function StaffPOS() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [enabledDemoMode, setEnabledDemoMode] = useState(false);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  // Check if merchantId is valid (basic UUID format check)
  const isValidMerchantId = merchantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(merchantId);
  const isDemoMode = searchParams.get('demo') === '1' || enabledDemoMode;

  const playBeep = () => {
    const audio = new Audio('/beep.mp3');
    audio.play().catch(() => {}); // Ignore errors if audio fails
  };

  const handleKeypadPress = (digit: string) => {
    if (lockoutUntil > Date.now()) return;
    
    if (digit === "delete") {
      setCode(prev => prev.slice(0, -1));
    } else if (code.length < 6) {
      setCode(prev => prev + digit);
    }
  };

  const validateCode = async (paymentCode: string) => {
    if (!isValidMerchantId && !isDemoMode) {
      toast({
        title: "Invalid Merchant ID",
        description: "Please ensure you're using the correct POS URL with a valid merchant ID, or enable demo mode.",
        variant: "destructive"
      });
      return;
    }

    if (lockoutUntil > Date.now()) {
      toast({
        title: "Locked Out",
        description: "Too many failed attempts. Please wait.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('validatePendingTransaction', {
        body: { 
          paymentCode, 
          merchantId, 
          captureNow: false,
          isDemoMode: isDemoMode 
        }
      });

      if (error) throw error;

      setConfirmationData({
        originalAmount: data.originalAmount,
        finalAmount: data.finalAmount,
        creditsApplied: (data.originalAmount - data.finalAmount),
        creditsToIssue: data.cashbackAmount || 0,
        merchantName: data.merchantName,
        paymentCode
      });
      setShowConfirmation(true);
      setFailedAttempts(0);
    } catch (error: any) {
      console.error("Validation error:", error);
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      // Extract error details for better error messages
      let errorMessage = "Code not found";
      if (error?.message) {
        if (error.message.includes("invalid input syntax for type uuid")) {
          errorMessage = "Invalid merchant ID in URL. Please check the POS link.";
        } else if (error.message.includes("expired")) {
          errorMessage = "Payment code has expired";
        } else if (error.message.includes("already used")) {
          errorMessage = "Payment code has already been used";
        } else {
          errorMessage = error.message;
        }
      }
      
      if (newFailedAttempts >= 5) {
        setLockoutUntil(Date.now() + 60000); // 60 second lockout
        toast({
          title: "Too Many Failed Attempts",
          description: "Locked out for 60 seconds",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invalid Code",
          description: `${errorMessage}. ${5 - newFailedAttempts} attempts remaining.`,
          variant: "destructive"
        });
      }
      setCode("");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPayment = async () => {
    if (!confirmationData) return;
    
    setIsProcessing(true);
    try {
      await supabase.functions.invoke('confirmCashCollection', {
        body: { 
          paymentCode: confirmationData.paymentCode,
          merchantId 
        }
      });

      // Success feedback
      playBeep();
      document.body.style.backgroundColor = '#22c55e';
      setTimeout(() => {
        document.body.style.backgroundColor = '';
      }, 500);

      toast({
        title: "RECEIVED $" + confirmationData.finalAmount.toFixed(2),
        description: `Issued $${confirmationData.creditsToIssue.toFixed(2)} credits`,
      });

      // Auto-reset after 3 seconds
      setTimeout(() => {
        setShowConfirmation(false);
        setConfirmationData(null);
        setCode("");
      }, 3000);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startQRScan = () => {
    setIsScanning(true);
  };

  // Initialize QR scanner after the scan screen renders
  useEffect(() => {
    if (isScanning) {
      // Small delay to ensure the DOM element exists
      const timer = setTimeout(() => {
        const qrReaderElement = document.getElementById("qr-reader");
        if (qrReaderElement) {
          const scanner = new Html5QrcodeScanner("qr-reader", {
            qrbox: { width: 250, height: 250 },
            fps: 5,
          }, false);
          
          scanner.render(
            (decodedText) => {
              scanner.clear();
              setIsScanning(false);
              
              // Parse the payment code from QR content
              const parsedCode = parsePaymentCode(decodedText);
              if (parsedCode) {
                validateCode(parsedCode);
              } else {
                toast({
                  title: "Invalid QR Code",
                  description: "Could not find a valid 6-digit payment code in the scanned QR.",
                  variant: "destructive"
                });
              }
            },
            () => {} // Ignore errors
          );
          
          scannerRef.current = scanner;
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isScanning]);

  const stopQRScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (code.length === 6) {
      validateCode(code);
    }
  }, [code]);

  if (showConfirmation && confirmationData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <h2 className="text-2xl font-bold">Confirm Payment</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span>Bill Amount:</span>
                <span className="font-bold">${confirmationData.originalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg text-green-600">
                <span>Credits Applied:</span>
                <span>-${confirmationData.creditsApplied.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Customer Pays:</span>
                <span>${confirmationData.finalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg text-primary">
                <span>Credits to Issue:</span>
                <span>${confirmationData.creditsToIssue.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={confirmPayment}
                disabled={isProcessing}
                size="lg" 
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-5 h-5 mr-2" />
                Confirm Received
              </Button>
              <Button 
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmationData(null);
                  setCode("");
                }}
                variant="outline"
                size="lg"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isScanning) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold mb-2">Scan Payment QR Code</h2>
            </div>
            <div id="qr-reader" className="mb-4"></div>
            <Button onClick={stopQRScan} variant="outline" className="w-full">
              Cancel Scan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const keypadNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const isLockedOut = lockoutUntil > Date.now();
  const lockoutSecondsRemaining = Math.ceil((lockoutUntil - Date.now()) / 1000);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Payment Terminal</h1>
            <p className="text-muted-foreground">Enter 6-digit payment code</p>
          </div>

          {/* Merchant ID Warning */}
          {!isValidMerchantId && !isDemoMode && (
            <Alert className="mb-6" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Invalid merchant ID. Please use the correct POS URL format: <br />
                <code className="text-xs">/merchant/{'<merchant-uuid>'}/pos</code>
                <div className="mt-2">
                  <Button 
                    onClick={() => setEnabledDemoMode(true)}
                    size="sm"
                    variant="outline"
                  >
                    Enable Demo Mode
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isDemoMode && (
            <Alert className="mb-6">
              <AlertDescription>
                Demo mode enabled - validation will work with test codes
              </AlertDescription>
            </Alert>
          )}

          {/* Code Display */}
          <div className="bg-muted rounded-lg p-6 mb-6 text-center">
            <div className="text-3xl font-mono tracking-wider">
              {code.padEnd(6, '•')}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {keypadNumbers.map((num) => (
              <Button
                key={num}
                onClick={() => handleKeypadPress(num)}
                disabled={isLockedOut || isProcessing}
                size="lg"
                variant="outline"
                className="h-16 text-xl"
              >
                {num}
              </Button>
            ))}
            <Button
              onClick={() => handleKeypadPress('delete')}
              disabled={isLockedOut || isProcessing}
              size="lg"
              variant="outline"
              className="h-16 col-span-3"
            >
              <Delete className="w-5 h-5 mr-2" />
              Delete
            </Button>
          </div>

          {/* QR Scan Button */}
          <Button
            onClick={startQRScan}
            disabled={isLockedOut || isProcessing}
            size="lg"
            className="w-full"
          >
            <Camera className="w-5 h-5 mr-2" />
            Scan QR Code
          </Button>

          {isLockedOut && (
            <p className="text-center text-red-500 mt-4 text-sm">
              Locked out for {lockoutSecondsRemaining} seconds due to failed attempts
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}