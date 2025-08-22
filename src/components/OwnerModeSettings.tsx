import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, Unlock } from "lucide-react";

interface OwnerModeSettingsProps {
  merchantId: string;
}

export default function OwnerModeSettings({ merchantId }: OwnerModeSettingsProps) {
  const { toast } = useToast();
  const [hasPin, setHasPin] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [unlockPin, setUnlockPin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPinStatus();
    // Check if owner mode is already unlocked in session
    const unlocked = localStorage.getItem(`owner_mode_${merchantId}`);
    if (unlocked && Date.now() < parseInt(unlocked)) {
      setIsUnlocked(true);
    }
  }, [merchantId]);

  const checkPinStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('payout_account_info')
        .eq('id', merchantId)
        .single();

      if (error) throw error;
      
      const payoutInfo = data.payout_account_info as any;
      setHasPin(!!(payoutInfo?.owner_pin_hash));
    } catch (error) {
      console.error('Error checking PIN status:', error);
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + merchantId); // Salt with merchant ID
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const setOwnerPin = async () => {
    if (newPin.length < 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be at least 4 digits",
        variant: "destructive"
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "PIN and confirmation must match",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const pinHash = await hashPin(newPin);
      
      const { error } = await supabase
        .from('merchants')
        .update({
          payout_account_info: {
            owner_pin_hash: pinHash
          }
        })
        .eq('id', merchantId);

      if (error) throw error;

      setHasPin(true);
      setShowSetPin(false);
      setNewPin("");
      setConfirmPin("");
      
      toast({
        title: "Success",
        description: "Owner PIN has been set successfully"
      });
    } catch (error) {
      console.error('Error setting PIN:', error);
      toast({
        title: "Error",
        description: "Failed to set Owner PIN",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const unlockOwnerMode = async () => {
    if (!unlockPin) {
      toast({
        title: "PIN Required",
        description: "Please enter your Owner PIN",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('payout_account_info')
        .eq('id', merchantId)
        .single();

      if (error) throw error;

      const payoutInfo = data.payout_account_info as any;
      const storedHash = payoutInfo?.owner_pin_hash;
      
      if (!storedHash) {
        throw new Error('No PIN set');
      }

      const inputHash = await hashPin(unlockPin);
      
      if (inputHash === storedHash) {
        // Unlock for 15 minutes
        const unlockUntil = Date.now() + (15 * 60 * 1000);
        localStorage.setItem(`owner_mode_${merchantId}`, unlockUntil.toString());
        
        setIsUnlocked(true);
        setUnlockPin("");
        
        toast({
          title: "Owner Mode Unlocked",
          description: "You now have access to advanced features for 15 minutes"
        });
      } else {
        throw new Error('Invalid PIN');
      }
    } catch (error) {
      console.error('Error unlocking owner mode:', error);
      toast({
        title: "Invalid PIN",
        description: "The PIN you entered is incorrect",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const lockOwnerMode = () => {
    localStorage.removeItem(`owner_mode_${merchantId}`);
    setIsUnlocked(false);
    setUnlockPin("");
    
    toast({
      title: "Owner Mode Locked",
      description: "Advanced features are now locked"
    });
  };

  return (
    <div className="space-y-4">
      {!hasPin ? (
        // No PIN set yet
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mx-auto">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Owner Mode Not Set Up</h3>
            <p className="text-sm text-muted-foreground">
              Set up a PIN to unlock analytics, settlements, and transaction management
            </p>
          </div>
          <Button onClick={() => setShowSetPin(true)} variant="outline">
            Set Up Owner PIN
          </Button>
        </div>
      ) : isUnlocked ? (
        // Owner mode is unlocked
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mx-auto">
            <Unlock className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-medium text-green-600 dark:text-green-400">Owner Mode Active</h3>
            <p className="text-sm text-muted-foreground">
              You have access to all advanced features
            </p>
          </div>
          <Button onClick={lockOwnerMode} variant="outline" size="sm">
            Lock Owner Mode
          </Button>
        </div>
      ) : (
        // PIN set but locked
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Owner Mode Locked</h3>
            <p className="text-sm text-muted-foreground">
              Enter your PIN to unlock advanced features
            </p>
          </div>
          <div className="space-y-2 max-w-xs mx-auto">
            <Input
              type="password"
              placeholder="Enter Owner PIN"
              value={unlockPin}
              onChange={(e) => setUnlockPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && unlockOwnerMode()}
            />
            <Button 
              onClick={unlockOwnerMode} 
              disabled={loading || !unlockPin}
              className="w-full"
            >
              {loading ? 'Unlocking...' : 'Unlock Owner Mode'}
            </Button>
          </div>
        </div>
      )}

      {/* Set PIN Modal/Overlay */}
      {showSetPin && (
        <Card className="mt-4">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPin">New Owner PIN</Label>
              <Input
                id="newPin"
                type="password"
                placeholder="Enter 4-digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={setOwnerPin} 
                disabled={loading || !newPin || !confirmPin}
                className="flex-1"
              >
                {loading ? 'Setting...' : 'Set PIN'}
              </Button>
              <Button 
                onClick={() => {
                  setShowSetPin(false);
                  setNewPin("");
                  setConfirmPin("");
                }} 
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}