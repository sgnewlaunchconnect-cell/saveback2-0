import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, ArrowLeft, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GrabData {
  id: string;
  qrToken: string;
  pin: string;
  expiresAt: string;
  countdown: number;
  deal: {
    title: string;
    merchant: string;
  };
}

export default function GrabPass() {
  const { grabId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [showPin, setShowPin] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Get grab data from navigation state
  const grabData = location.state?.grabData as GrabData;

  useEffect(() => {
    if (!grabData) {
      // If no grab data, redirect back to deals
      navigate('/deals');
      return;
    }

    // Calculate initial time left
    const expiryTime = new Date(grabData.expiresAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        toast({
          title: "Grab Expired",
          description: "Your grab has expired. Please try again.",
          variant: "destructive",
        });
        navigate('/deals');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [grabData, navigate, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied`,
      description: `${label} has been copied to clipboard`,
    });
  };

  if (!grabData) {
    return null; // Component will redirect in useEffect
  }

  // Generate QR Code URL (using a simple QR service for demo)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(grabData.qrToken)}`;

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
            <h1 className="text-xl font-bold">Grab Pass</h1>
            <p className="text-sm text-muted-foreground">
              Expires in {formatTime(timeLeft)}
            </p>
          </div>
        </div>

        {/* Deal Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-1">{grabData.deal.title}</h2>
            <p className="text-sm text-muted-foreground">{grabData.deal.merchant}</p>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold mb-4">Scan to Redeem</h3>
            <div className="flex justify-center mb-4">
              <img 
                src={qrCodeUrl} 
                alt="QR Code for grab redemption"
                className="border rounded-lg bg-white p-2"
                width={200}
                height={200}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(grabData.qrToken, 'QR Token')}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Token
            </Button>
          </CardContent>
        </Card>

        {/* PIN */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">PIN Code</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPin(!showPin)}
                className="p-2"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-mono font-bold tracking-widest mb-3 p-3 bg-muted rounded-lg">
                {showPin ? grabData.pin : '••••••'}
              </div>
              
              {showPin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(grabData.pin, 'PIN')}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy PIN
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-3">
              {showPin ? 'Tap eye to hide PIN' : 'Tap eye to reveal PIN'}
            </p>
          </CardContent>
        </Card>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold text-sm mb-2">How to use:</h4>
          <ol className="text-xs text-muted-foreground space-y-1">
            <li>1. Show QR code or PIN to merchant</li>
            <li>2. Merchant scans/enters code to process</li>
            <li>3. Enjoy your deal and earn rewards!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}