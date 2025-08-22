import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Camera, Flashlight, Delete, Check, X } from "lucide-react";
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
  const { toast } = useToast();
  
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

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
        body: { paymentCode, merchantId, captureNow: false }
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
    } catch (error) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
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
          description: `Code not found. ${5 - newFailedAttempts} attempts remaining.`,
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
  };

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Payment Terminal</h1>
            <p className="text-muted-foreground">Enter 6-digit payment code</p>
          </div>

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
              Locked out due to failed attempts
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}