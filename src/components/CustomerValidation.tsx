import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { QrCode, Timer, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerValidation() {
  const [billAmount, setBillAmount] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationCode, setValidationCode] = useState<{
    code: string;
    expiresAt: Date;
    txnRef: string;
  } | null>(null);
  const { toast } = useToast();

  const generateValidationCode = async () => {
    const bill = parseFloat(billAmount);
    if (!bill || bill <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bill amount",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Generate validation code
      const { data, error } = await supabase.functions.invoke('generateValidationCode', {
        body: {
          billAmount: bill,
          merchantId: '550e8400-e29b-41d4-a716-446655440002' // Demo merchant ID
        }
      });

      if (error) throw error;

      if (data.success) {
        setValidationCode({
          code: data.pin,
          expiresAt: new Date(data.expiresAt),
          txnRef: data.txnRef
        });
        
        toast({
          title: "Code Generated! ✅",
          description: "Show this code to the hawker for validation"
        });
      } else {
        throw new Error(data.error || 'Failed to generate code');
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetCode = () => {
    setValidationCode(null);
    setBillAmount("");
  };

  if (validationCode) {
    const timeLeft = Math.max(0, Math.floor((validationCode.expiresAt.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <div className="text-center space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-primary mb-2">
                  Show to Hawker
                </h1>
                <p className="text-muted-foreground">
                  Present this code for validation
                </p>
              </div>
              
              {/* Large Validation Code Display */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-8 text-center">
                  <QrCode className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <div className="text-6xl font-mono font-bold text-blue-600 tracking-wider mb-2">
                    {validationCode.code}
                  </div>
                  <div className="text-sm text-blue-700">
                    Validation Code
                  </div>
                </CardContent>
              </Card>
              
              {/* Timer */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-lg">
                      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-1">
                    Code expires
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Bill Amount:</span>
                  <span className="font-semibold">${parseFloat(billAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reference:</span>
                  <span className="font-mono">{validationCode.txnRef}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Payment Confirmed
                  </span>
                </div>
                <p className="text-xs text-green-600">
                  You've paid the hawker via PayNow. Now show this code to get your credits!
                </p>
              </div>
              
              <Button onClick={resetCode} variant="outline" className="w-full">
                Generate New Code
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
            <QrCode className="w-5 h-5" />
            I've Paid the Hawker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Generate Validation Code</h2>
            <p className="text-sm text-muted-foreground">
              After paying the hawker via PayNow, generate a code to get your credits
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="billAmount">Bill Amount You Paid</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="billAmount"
                  type="number"
                  placeholder="0.00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="pl-8"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <Button
              onClick={generateValidationCode}
              disabled={!billAmount || parseFloat(billAmount) <= 0 || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? "Generating..." : "Generate Code for Hawker"}
            </Button>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-sm">How it works:</h3>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Pay hawker via their PayNow QR (normal payment)</li>
              <li>2. Enter the amount you paid here</li>
              <li>3. Show the generated code to hawker</li>
              <li>4. Hawker scans code → you get credits!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}