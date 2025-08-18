import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeOff, ArrowLeft, Copy, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [grabStatus, setGrabStatus] = useState<'LOCKED' | 'VALIDATED' | 'PROCESSING' | 'REDEEMED'>('LOCKED');
  const [creditsEarned, setCreditsEarned] = useState<{ local: number; network: number } | null>(null);

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
      
      if (remaining === 0 && grabStatus === 'LOCKED') {
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
  }, [grabData, navigate, toast, grabStatus]);

  // Real-time listening for grab status changes
  useEffect(() => {
    if (!grabData) return;

    const channel = supabase
      .channel('grab-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'grabs',
          filter: `id=eq.${grabData.id}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          setGrabStatus(newStatus);
          
          if (newStatus === 'VALIDATED') {
            toast({
              title: "Grab Validated! ✅",
              description: "Merchant has validated your grab. Processing payment...",
            });
          } else if (newStatus === 'REDEEMED') {
            toast({
              title: "Transaction Complete! 🎉",
              description: "Credits have been added to your account.",
            });
            
            // Simulate credits earned (in a real app, this would come from the payload)
            setCreditsEarned({
              local: Math.floor(Math.random() * 50) + 10,
              network: Math.floor(Math.random() * 20) + 5
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [grabData, toast]);

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

  // Demo function to simulate merchant scan
  const simulateMerchantScan = () => {
    if (grabStatus !== 'LOCKED') return;
    
    // Step 1: Merchant validates
    setGrabStatus('VALIDATED');
    toast({
      title: "Grab Validated! ✅",
      description: "Merchant has validated your grab. Processing payment...",
    });
    
    // Step 2: After 2 seconds, complete transaction
    setTimeout(() => {
      setGrabStatus('REDEEMED');
      setCreditsEarned({
        local: Math.floor(Math.random() * 50) + 15, // 15-65 cents
        network: Math.floor(Math.random() * 30) + 8  // 8-38 cents
      });
      toast({
        title: "Transaction Complete! 🎉",
        description: "Credits have been added to your account.",
      });
    }, 2000);
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

        {/* Status Indicator */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {grabStatus === 'LOCKED' && (
                <>
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Waiting for Merchant</p>
                    <p className="text-sm text-muted-foreground">Show your QR code or PIN to the merchant</p>
                  </div>
                </>
              )}
              {grabStatus === 'VALIDATED' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Validated ✅</p>
                    <p className="text-sm text-muted-foreground">Processing your payment...</p>
                  </div>
                </>
              )}
              {grabStatus === 'PROCESSING' && (
                <>
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Processing Payment</p>
                    <p className="text-sm text-muted-foreground">Almost done...</p>
                  </div>
                </>
              )}
              {grabStatus === 'REDEEMED' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Transaction Complete! 🎉</p>
                    <p className="text-sm text-muted-foreground">Credits have been added to your account</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credits Earned - Show when transaction is complete */}
        {grabStatus === 'REDEEMED' && creditsEarned && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-800 mb-3">Credits Earned!</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Local Credits:</span>
                  <span className="font-bold text-green-800">+{creditsEarned.local}¢</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Network Credits:</span>
                  <span className="font-bold text-green-800">+{creditsEarned.network}¢</span>
                </div>
                <div className="border-t border-green-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-800">Total Earned:</span>
                    <span className="font-bold text-lg text-green-800">+{creditsEarned.local + creditsEarned.network}¢</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Demo Button - Only show when status is LOCKED */}
        {grabStatus === 'LOCKED' && (
          <div className="mt-6">
            <Button 
              onClick={simulateMerchantScan}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3"
            >
              🎬 Demo: Simulate Merchant Scan
            </Button>
          </div>
        )}

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