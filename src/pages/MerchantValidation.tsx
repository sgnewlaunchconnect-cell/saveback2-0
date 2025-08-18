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
import { supabase } from '@/integrations/supabase/client';

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
      const { data, error } = await supabase.functions.invoke('validateGrab', {
        body: {
          [type === 'qr' ? 'qrToken' : 'pin']: identifier
        }
      });

      if (error) {
        throw error;
      }

      setValidationResult(data);
      
      if (data.isValid) {
        toast({
          title: "Valid Grab ✓",
          description: `Grab validated successfully for ${data.grab?.deal.title}`,
        });
      } else {
        toast({
          title: "Invalid Grab ✗",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate grab. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    validateGrab(qrInput.trim(), 'qr');
  };

  const handlePINValidation = () => {
    if (!pinInput.trim() || pinInput.length !== 6) {
      toast({
        title: "Valid PIN Required",
        description: "Please enter a 6-digit PIN to validate",
        variant: "destructive",
      });
      return;
    }
    validateGrab(pinInput.trim(), 'pin');
  };

  const resetValidation = () => {
    setValidationResult(null);
    setQrInput('');
    setPinInput('');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/deals')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Validate Grab</h1>
            <p className="text-sm text-muted-foreground">
              Scan QR code or enter PIN to validate customer grab
            </p>
          </div>
        </div>

        {/* Validation Result */}
        {validationResult && (
          <Card className={`mb-6 ${validationResult.isValid ? 'border-green-200' : 'border-red-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <X className="h-5 w-5 text-red-600" />
                )}
                <CardTitle className={validationResult.isValid ? 'text-green-800' : 'text-red-800'}>
                  {validationResult.isValid ? 'Valid Grab ✓' : 'Invalid Grab ✗'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {validationResult.isValid && validationResult.grab ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">{validationResult.grab.deal.title}</p>
                    <p className="text-sm text-muted-foreground">{validationResult.grab.deal.merchant}</p>
                  </div>
                  <div>
                    <p className="text-sm">Customer: {validationResult.grab.user.display_name}</p>
                    <Badge variant="secondary">Status: {validationResult.grab.status}</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{validationResult.message}</p>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetValidation}
                className="mt-4 w-full"
              >
                Validate Another
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Validation Input */}
        {!validationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Validation Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="qr" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qr">QR Scanner</TabsTrigger>
                  <TabsTrigger value="pin">Manual PIN</TabsTrigger>
                </TabsList>
                
                <TabsContent value="qr" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qr-input">QR Token</Label>
                    <Input
                      id="qr-input"
                      placeholder="Paste or enter QR token here"
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Scan the customer's QR code or paste the token manually
                    </p>
                  </div>
                  <Button 
                    onClick={handleQRValidation} 
                    disabled={loading || !qrInput.trim()}
                    className="w-full"
                  >
                    {loading ? 'Validating...' : 'Validate QR Token'}
                  </Button>
                </TabsContent>
                
                <TabsContent value="pin" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin-input">6-Digit PIN</Label>
                    <Input
                      id="pin-input"
                      placeholder="Enter 6-digit PIN"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={loading}
                      className="text-center text-2xl font-mono tracking-widest"
                    />
                    <p className="text-xs text-muted-foreground">
                      Ask customer for their 6-digit PIN code
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
        )}

        {/* Instructions */}
        {!validationResult && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-2">How to validate:</h4>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Ask customer to show their grab QR or PIN</li>
              <li>2. Scan QR code or enter PIN in the form above</li>
              <li>3. System will verify and show validation result</li>
              <li>4. Process transaction if grab is valid</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}