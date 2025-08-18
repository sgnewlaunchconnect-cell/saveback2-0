import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Wallet, CreditCard, History, Plus, Minus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreditPaymentSettings from '@/components/CreditPaymentSettings';

interface CreditBalance {
  local_cents: number;
  network_cents: number;
  merchant_name?: string;
}

interface CreditTransaction {
  id: string;
  type: 'EARNED' | 'USED';
  amount: number;
  description: string;
  date: string;
  merchant?: string;
}

export default function WalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState<CreditBalance[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      // Demo credits data
      const demoCredits = [
        { local_cents: 850, network_cents: 200, merchant_name: "Coffee Corner" },
        { local_cents: 500, network_cents: 150, merchant_name: "Pizza Palace" },
        { local_cents: 200, network_cents: 100, merchant_name: "Fashion Forward" }
      ];
      
      // Demo transaction history
      const demoTransactions = [
        {
          id: '1',
          type: 'EARNED' as const,
          amount: 45,
          description: 'Cashback from purchase',
          date: '2025-01-18',
          merchant: 'Coffee Corner'
        },
        {
          id: '2',
          type: 'USED' as const,
          amount: -299,
          description: 'Credits applied to payment',
          date: '2025-01-17',
          merchant: 'Pizza Palace'
        },
        {
          id: '3',
          type: 'EARNED' as const,
          amount: 32,
          description: 'Deal completion bonus',
          date: '2025-01-16',
          merchant: 'Fashion Forward'
        },
        {
          id: '4',
          type: 'EARNED' as const,
          amount: 28,
          description: 'Weekly activity reward',
          date: '2025-01-15'
        }
      ];

      setCredits(demoCredits);
      setTransactions(demoTransactions);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalLocalCredits = credits.reduce((sum, credit) => sum + credit.local_cents, 0);
  const totalNetworkCredits = credits.reduce((sum, credit) => sum + credit.network_cents, 0);
  const totalCredits = totalLocalCredits + totalNetworkCredits;

  const handleSettingsChange = (settings: any) => {
    toast({
      title: "Settings Updated",
      description: "Your credit preferences have been saved.",
    });
  };

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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6" />
              My Wallet
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your credits and payment preferences
            </p>
          </div>
        </div>

        {/* Credit Balance Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                ${(totalCredits / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Available to spend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Local Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                ${(totalLocalCredits / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Use at specific merchants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Network Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                ${(totalNetworkCredits / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Use anywhere in network
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Credits by Merchant */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Credits by Merchant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {credits.map((credit, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{credit.merchant_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Local: ${(credit.local_cents / 100).toFixed(2)} • 
                      Network: ${(credit.network_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    ${((credit.local_cents + credit.network_cents) / 100).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Credit Payment Settings */}
        <CreditPaymentSettings 
          localCredits={totalLocalCredits}
          networkCredits={totalNetworkCredits}
          onSettingsChange={handleSettingsChange}
        />

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      transaction.type === 'EARNED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.type === 'EARNED' ? 
                        <Plus className="h-4 w-4" /> : 
                        <Minus className="h-4 w-4" />
                      }
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.merchant && `${transaction.merchant} • `}
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-bold ${
                    transaction.type === 'EARNED' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'EARNED' ? '+' : ''}
                    ${Math.abs(transaction.amount / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* How Credits Work */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
              💡 How Credit Payments Work
            </h3>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p><strong>1. Grab a Deal:</strong> Choose any deal from the deals page</p>
              <p><strong>2. Auto-Calculate:</strong> App instantly shows your final payment amount</p>
              <p><strong>3. Know Before You Go:</strong> You see exactly what you'll pay before visiting merchant</p>
              <p><strong>4. Show Merchant:</strong> Present QR/PIN - they see the pre-calculated amount</p>
              <p><strong>5. Pay & Earn:</strong> Pay remaining amount (if any) and earn new credits!</p>
            </div>
            <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
              ✨ No surprises! You never have to guess payment amounts - the app handles all calculations.
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            View All Transactions
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Add Payment Method
          </Button>
        </div>
      </div>
    </div>
  );
}