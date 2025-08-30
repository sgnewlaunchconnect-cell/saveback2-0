import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Wallet, CreditCard, History, Plus, Minus, TrendingUp, Search, ShoppingBag, Filter, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserMerchantCredits } from '@/hooks/useUserMerchantCredits';
import { useUserCreditEvents } from '@/hooks/useUserCreditEvents';
import { formatCurrencyDisplay } from '@/utils/currency';
import CreditPaymentSettings from '@/components/CreditPaymentSettings';

export default function WalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'name' | 'recent'>('amount');
  const [showFilter, setShowFilter] = useState(false);

  // Get current user
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const { data: merchantCredits = [], isLoading: creditsLoading } = useUserMerchantCredits(user?.id);
  const { data: creditEvents = [], isLoading: eventsLoading } = useUserCreditEvents(user?.id);

  // Calculate totals
  const totalLocalCredits = merchantCredits.reduce((sum, credit) => sum + credit.local_cents, 0);
  const totalNetworkCredits = merchantCredits.reduce((sum, credit) => sum + credit.network_cents, 0);
  const totalCredits = totalLocalCredits + totalNetworkCredits;

  // Filter and sort merchant credits
  const filteredCredits = useMemo(() => {
    let filtered = merchantCredits.filter(credit => 
      credit.merchant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      credit.merchant?.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (sortBy) {
      case 'amount':
        return filtered.sort((a, b) => (b.local_cents + b.network_cents) - (a.local_cents + a.network_cents));
      case 'name':
        return filtered.sort((a, b) => (a.merchant?.name || '').localeCompare(b.merchant?.name || ''));
      case 'recent':
        return filtered;
      default:
        return filtered;
    }
  }, [merchantCredits, searchQuery, sortBy]);

  // Get popular merchants for suggestions
  const suggestedMerchants = useMemo(() => {
    return merchantCredits
      .filter(credit => (credit.local_cents + credit.network_cents) > 0)
      .slice(0, 3)
      .map(credit => credit.merchant?.name)
      .filter(Boolean);
  }, [merchantCredits]);

  const handleUseCreditsTap = (merchantId: string) => {
    navigate(`/pay/${merchantId}`);
  };

  const handleSettingsChange = (settings: any) => {
    toast({
      title: "Settings Updated",
      description: "Your credit preferences have been saved.",
    });
  };

  if (creditsLoading || eventsLoading || !user) {
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

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Credits by Merchant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search merchants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Suggestions */}
            {!searchQuery && suggestedMerchants.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Quick access:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedMerchants.map((merchantName, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery(merchantName)}
                      className="text-xs"
                    >
                      {merchantName}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilter(!showFilter)}
                className="text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Sort: {sortBy === 'amount' ? 'Highest Amount' : sortBy === 'name' ? 'Name' : 'Recent'}
              </Button>
              {showFilter && (
                <div className="flex gap-1">
                  {(['amount', 'name', 'recent'] as const).map((option) => (
                    <Button
                      key={option}
                      variant={sortBy === option ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSortBy(option)}
                      className="text-xs"
                    >
                      {option === 'amount' ? 'Amount' : option === 'name' ? 'Name' : 'Recent'}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Merchant Credits List */}
            <div className="space-y-3">
              {filteredCredits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 
                    `No merchants found matching "${searchQuery}"` : 
                    'No merchant credits yet. Start earning by making purchases!'
                  }
                </div>
              ) : (
                filteredCredits.map((credit) => (
                  <div key={credit.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg group hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      {credit.merchant?.logo_url ? (
                        <img 
                          src={credit.merchant.logo_url} 
                          alt={credit.merchant.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{credit.merchant?.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {credit.merchant?.category} • 
                          Local: {formatCurrencyDisplay(credit.local_cents)} • 
                          Network: {formatCurrencyDisplay(credit.network_cents)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {formatCurrencyDisplay(credit.local_cents + credit.network_cents)}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleUseCreditsTap(credit.merchant_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Use Credits
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
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
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {creditEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No credit activity yet</p>
                  <p className="text-sm">Start earning credits by making purchases!</p>
                </div>
              ) : (
                creditEvents.map((event) => {
                  const isEarned = (event.local_cents_change > 0 || event.network_cents_change > 0);
                  const totalChange = Math.abs(event.local_cents_change + event.network_cents_change);
                  
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isEarned ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {isEarned ? 
                            <Plus className="h-4 w-4" /> : 
                            <Minus className="h-4 w-4" />
                          }
                        </div>
                        <div>
                          <p className="font-medium">
                            {event.description || 
                             (isEarned ? 'Credits earned' : 'Credits used')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.merchant?.name && `${event.merchant.name} • `}
                            {new Date(event.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        isEarned ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isEarned ? '+' : '-'}
                        {formatCurrencyDisplay(totalChange)}
                      </div>
                    </div>
                  );
                })
              )}
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