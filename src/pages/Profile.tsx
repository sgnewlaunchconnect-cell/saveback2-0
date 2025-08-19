import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, CreditCard, Trophy, History, Settings, Wallet } from "lucide-react";
import TierBadge from "@/components/TierBadge";


interface UserProfile {
  display_name: string;
  email: string;
  total_grabs: number;
  total_redemptions: number;
  total_savings: number;
  tier_level: string;
  tier_points: number;
}

interface CreditBalance {
  local_cents: number;
  network_cents: number;
  merchant_name?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<CreditBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadCredits();
  }, []);

  const loadProfile = async () => {
    try {
      // Demo data since no auth required
      const demoProfile = {
        display_name: "Demo User",
        email: "demo@example.com",
        total_grabs: 15,
        total_redemptions: 8,
        total_savings: 2500, // $25.00
        tier_level: "Silver",
        tier_points: 23
      };
      setProfile(demoProfile);
    } catch (error) {
      toast({
        title: "Error loading profile",
        description: "Could not load your profile information",
        variant: "destructive",
      });
    }
  };

  const loadCredits = async () => {
    try {
      // Demo credits data
      const demoCredits = [
        { local_cents: 500, network_cents: 150, merchant_name: "Coffee Shop" },
        { local_cents: 300, network_cents: 100, merchant_name: "Pizza Place" },
        { local_cents: 750, network_cents: 200, merchant_name: "Book Store" }
      ];
      setCredits(demoCredits);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalLocalCredits = credits.reduce((sum, credit) => sum + credit.local_cents, 0);
  const totalNetworkCredits = credits.reduce((sum, credit) => sum + credit.network_cents, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-6 w-6" />
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>

        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.display_name || 'Not set'}</p>
              </div>
              <TierBadge 
                tier={profile?.tier_level || 'Bronze'} 
                points={profile?.tier_points || 0}
                showPoints={true}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email || 'Not set'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Total Grabs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{profile?.total_grabs || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Redemptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{profile?.total_redemptions || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Total Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                ${((profile?.total_savings || 0) / 100).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Your Tier Benefits
            </CardTitle>
            <CardDescription>
              Unlock more benefits by using more grab passes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <TierBadge 
                tier={profile?.tier_level || 'Bronze'} 
                points={profile?.tier_points || 0}
                showPoints={true}
              />
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium text-primary">Current Tier Benefits</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  {profile?.tier_level === 'Bronze' && (
                    <>
                      <li>• Basic grab pass functionality</li>
                      <li>• Standard credit earning rate</li>
                    </>
                  )}
                  {profile?.tier_level === 'Silver' && (
                    <>
                      <li>• +5% bonus network credits</li>
                      <li>• 2 concurrent grab passes</li>
                      <li>• Priority customer support</li>
                    </>
                  )}
                  {profile?.tier_level === 'Gold' && (
                    <>
                      <li>• +10% bonus network credits</li>
                      <li>• 3 concurrent grab passes</li>
                      <li>• Early access to new deals</li>
                    </>
                  )}
                  {profile?.tier_level === 'Platinum' && (
                    <>
                      <li>• +15% bonus network credits</li>
                      <li>• 5 concurrent grab passes</li>
                      <li>• VIP customer support</li>
                      <li>• Exclusive platinum deals</li>
                    </>
                  )}
                </ul>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">How to Earn Points</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li>• +1 point per used grab pass</li>
                  <li>• +1 bonus point for new merchants</li>
                  <li>• Points reset every 90 days</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Credit Balance
            </CardTitle>
            <CardDescription>
              Your accumulated credits across all merchants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Local Credits</p>
                <p className="text-2xl font-bold text-primary">
                  ${(totalLocalCredits / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Use at specific merchants
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Network Credits</p>
                <p className="text-2xl font-bold text-secondary-foreground">
                  ${(totalNetworkCredits / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Use anywhere in the network
                </p>
              </div>
            </div>

            {credits.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Credits by Merchant</h4>
                  {credits.map((credit, index) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <span className="text-sm">{credit.merchant_name}</span>
                      <Badge variant="secondary">
                        ${(credit.local_cents / 100).toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button 
            variant="default" 
            className="flex items-center gap-2"
            onClick={() => navigate('/wallet')}
          >
            <Wallet className="h-4 w-4" />
            Manage Wallet
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Account Settings
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Transaction History
          </Button>
        </div>
      </div>
    </div>
  );
}