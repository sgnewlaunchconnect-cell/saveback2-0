import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Scan, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ValidationResult {
  isValid: boolean;
  grab?: {
    id: string;
    pin: string;
    qr_token: string;
    status: string;
    expires_at: string;
    deal: {
      title: string;
      merchant: string;
    };
    user: {
      display_name: string;
    };
  };
  message: string;
}

export default function MerchantValidation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [qrInput, setQrInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const validateGrab = async (identifier: string, type: 'qr' | 'pin') => {
    setLoading(true);
    setValidationResult(null);

    try {
      // Demo validation - simulate successful validation
      setTimeout(() => {
        const demoResult: ValidationResult = {
          isValid: true,
          grab: {
            id: "demo-grab-123",
            pin: identifier,
            qr_token: identifier,
            status: "LOCKED",
            expires_at: new Date(Date.now() + 300000).toISOString(),
            deal: {
              title: "Demo Coffee Deal - 20% Off",
              merchant: "Demo Coffee Shop"
            },
            user: {
              display_name: "Demo User"
            }
          },
          message: "Valid grab found!"
        };
        
        setValidationResult(demoResult);
        setLoading(false);
        
        toast({
          title: "Grab Validated ✓",
          description: `Grab validated successfully for ${demoResult.grab?.deal.title}`,
        });

        // Simulate credits issued
        setTimeout(() => {
          toast({
            title: "Credits Added! 🎉",
            description: "Credits issued successfully! Your Tower grew.",
          });
        }, 1000);
      }, 1000);
      
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Validation Error",
        description: "Failed to validate grab. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQRValidation = () => {
    if (!qrInput.trim()) {
      toast({
        title: "QR Token Required",
        description: "Please enter a QR token to validate",
        variant: "destructive",
      });
      return;
    }
    validateGrab(qrInput, 'qr');
  };

  const handlePINValidation = () => {
    if (!pinInput.trim()) {
      toast({
        title: "PIN Required",
        description: "Please enter a PIN to validate",
        variant: "destructive",
      });
      return;
    }
    validateGrab(pinInput, 'pin');
  };

  const resetValidation = () => {
    setValidationResult(null);
    setQrInput('');
    setPinInput('');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/merchant/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Customer Validation</h1>
            <p className="text-muted-foreground">
              Validate customer grabs using QR codes or PINs
            </p>
          </div>
        </div>

        {/* Validation Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Validate Customer Grab
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">QR Code</TabsTrigger>
                <TabsTrigger value="pin">PIN</TabsTrigger>
              </TabsList>
              
              <TabsContent value="qr" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qr-input">QR Token</Label>
                  <Input
                    id="qr-input"
                    placeholder="Scan or enter QR token"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Scan the customer's QR code or manually enter the token
                  </p>
                </div>
                <Button 
                  onClick={handleQRValidation} 
                  disabled={loading || !qrInput.trim()}
                  className="w-full"
                >
                  {loading ? 'Validating...' : 'Validate QR Code'}
                </Button>
              </TabsContent>
              
              <TabsContent value="pin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin-input">6-Digit PIN</Label>
                  <Input
                    id="pin-input"
                    placeholder="Enter 6-digit PIN"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    maxLength={6}
                    disabled={loading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Ask the customer for their 6-digit PIN
                  </p>
                </div>
                <Button 
                  onClick={handlePINValidation} 
                  disabled={loading || pinInput.length !== 6}
                  className="w-full"
                >
                  {loading ? 'Validating...' : 'Validate PIN'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Validation Result */}
        {validationResult && (
          <Card className={`border-2 ${validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <>
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-green-600">Valid Grab</span>
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5 text-red-600" />
                    <span className="text-red-600">Invalid Grab</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validationResult.isValid && validationResult.grab ? (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Deal</p>
                      <p className="font-medium">{validationResult.grab.deal.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{validationResult.grab.user.display_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="secondary">{validationResult.grab.status}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expires</p>
                      <p className="text-sm">
                        {new Date(validationResult.grab.expires_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={resetValidation}
                      variant="outline"
                      className="flex-1"
                    >
                      Validate Another
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-red-600">{validationResult.message}</p>
                  <Button 
                    onClick={resetValidation}
                    variant="outline"
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Validate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-medium">QR Code Method:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Ask customer to show their Grab Pass QR code</li>
                <li>• Scan the code or manually enter the token</li>
                <li>• System will validate and process credits automatically</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">PIN Method:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Ask customer for their 6-digit PIN</li>
                <li>• Enter the PIN in the validation form</li>
                <li>• Verify customer identity before processing</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}