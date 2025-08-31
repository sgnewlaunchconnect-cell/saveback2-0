import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Search, Tag, Coins, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DealCard from '@/components/DealCard';
import DealBadge from '@/components/DealBadge';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  cashback_pct: number;
  reward_mode: string;
  end_at: string;
  views: number;
  grabs: number;
  stock?: number;
  redemptions?: number;
  merchant_id: string;
  merchants: {
    id: string;
    name: string;
    address: string;
    category: string;
    logo_url: string;
    payout_method: string;
    psp_enabled: boolean;
  };
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRewardType, setSelectedRewardType] = useState<'all' | 'discount' | 'cashback'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'all' | 'in-app' | 'pin-only'>('all');

  useEffect(() => {
    fetchDeals();
    
    // Set up real-time updates for deals
    const channel = supabase
      .channel('deals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deals'
        },
        (payload) => {
          console.debug('New deal created:', payload);
          // Add new deal if it's active and not expired
          const newDeal = payload.new;
          if (newDeal.is_active && (!newDeal.end_at || new Date(newDeal.end_at) > new Date())) {
            fetchDeals(); // Refresh to get complete data with merchant joins
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deals'
        },
        (payload) => {
          console.debug('Deal updated:', payload);
          // Update the specific deal in our state
          setDeals(currentDeals => 
            currentDeals.map(deal => 
              deal.id === payload.new.id 
                ? { ...deal, grabs: payload.new.grabs, redemptions: payload.new.redemptions }
                : deal
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeals = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id, title, description, discount_pct, cashback_pct, reward_mode, 
          end_at, views, grabs, stock, redemptions, merchant_id,
          merchants(id, name, address, category, logo_url, payout_method, psp_enabled)
        `)
        .eq('is_active', true)
        .or(`end_at.is.null,end_at.gt.${now}`) // Include deals with null end_at OR future end_at
        .order('created_at', { ascending: false }); // Show newest deals first

      if (error) {
        // Check if it's a 403 auth error
        if (error.message?.includes('403') || error.message?.includes('JWT')) {
          console.warn('Auth error detected, showing anonymous view');
          setDeals([]); // Show empty state for unauthenticated users
          toast({
            title: "Authentication required",
            description: "Please sign in to view deals",
            variant: "default"
          });
        } else {
          throw error;
        }
      } else {
        setDeals(data || []);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast({
        title: "Error",
        description: "Failed to load deals. Try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter deals based on search and filters
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchTerm === '' || 
      deal.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.merchants?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRewardType = selectedRewardType === 'all' ||
      (selectedRewardType === 'discount' && (deal.discount_pct || 0) > 0) ||
      (selectedRewardType === 'cashback' && (deal.cashback_pct || 0) > 0);

    const matchesCategory = selectedCategory === 'all' ||
      deal.merchants?.category === selectedCategory;

    const matchesPaymentType = selectedPaymentType === 'all' ||
      (selectedPaymentType === 'in-app' && deal.merchants?.psp_enabled) ||
      (selectedPaymentType === 'pin-only' && !deal.merchants?.psp_enabled);

    return matchesSearch && matchesRewardType && matchesCategory && matchesPaymentType;
  });

  // Get trending deals (sort by grabs desc, views desc, then end_at asc)
  const trendingDeals = [...filteredDeals]
    .sort((a, b) => {
      if ((b.grabs || 0) !== (a.grabs || 0)) return (b.grabs || 0) - (a.grabs || 0);
      if ((b.views || 0) !== (a.views || 0)) return (b.views || 0) - (a.views || 0);
      return new Date(a.end_at).getTime() - new Date(b.end_at).getTime();
    })
    .slice(0, 6);

  // Get direct discount deals (only discount, no cashback)
  const directDiscountDeals = filteredDeals
    .filter(deal => (deal.discount_pct || 0) > 0 && (deal.cashback_pct || 0) === 0)
    .slice(0, 6);

  // Get credit reward deals (only cashback, no discount)
  const creditRewardDeals = filteredDeals
    .filter(deal => (deal.cashback_pct || 0) > 0 && (deal.discount_pct || 0) === 0)
    .slice(0, 6);

  // Get in-app payment deals
  const inAppPaymentDeals = filteredDeals
    .filter(deal => deal.merchants?.psp_enabled)
    .slice(0, 6);

  // Get unique categories
  const categories = ['all', ...new Set(deals.map(deal => deal.merchants?.category || 'other'))];

  const DealSection = ({ title, deals, icon }: { title: string; deals: Deal[]; icon: React.ReactNode }) => (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deals available</p>
      ) : (
        <div className="space-y-3">
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} compact />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">

        {/* Search and Filter */}
        <div className="space-y-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals, merchants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Reward Type Filter */}
          <div className="flex gap-2">
            <Badge
              variant={selectedRewardType === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedRewardType('all')}
            >
              All
            </Badge>
            <Badge
              variant={selectedRewardType === 'discount' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedRewardType('discount')}
            >
              <Tag className="h-3 w-3 mr-1" />
              Direct Discount
            </Badge>
            <Badge
              variant={selectedRewardType === 'cashback' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedRewardType('cashback')}
            >
              <Coins className="h-3 w-3 mr-1" />
              Credit Rewards
            </Badge>
          </div>
          
          {/* Payment Type Filter */}
          <div className="flex gap-2">
            <Badge
              variant={selectedPaymentType === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedPaymentType('all')}
            >
              All Payment Types
            </Badge>
            <Badge
              variant={selectedPaymentType === 'in-app' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedPaymentType('in-app')}
            >
              In-app Payment
            </Badge>
            <Badge
              variant={selectedPaymentType === 'pin-only' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedPaymentType('pin-only')}
            >
              PIN Only
            </Badge>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in">
          {categories.map(category => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
          ))}
        </div>

        {/* Demo Button */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-dashed border-blue-300 dark:border-blue-700">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Try the Full Demo</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
              Experience the complete payment flow without creating an account
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/deals/demo-deal-123?demo=1')}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-950/30"
            >
              Start Demo →
            </Button>
          </CardContent>
        </Card>

        {/* Deal Sections - conditionally rendered based on filter */}
        {selectedRewardType === 'all' && (
          <>
            <DealSection 
              title="Trending" 
              deals={trendingDeals} 
              icon={<TrendingUp className="h-5 w-5 text-primary" />} 
            />

            <DealSection 
              title="In-app Payment" 
              deals={inAppPaymentDeals} 
              icon={<Coins className="h-5 w-5 text-green-600" />} 
            />

            <DealSection 
              title="Direct Discounts" 
              deals={directDiscountDeals} 
              icon={<Tag className="h-5 w-5 text-destructive" />} 
            />

            <DealSection 
              title="Credit Rewards" 
              deals={creditRewardDeals} 
              icon={<Coins className="h-5 w-5 text-secondary-foreground" />} 
            />
          </>
        )}

        {selectedRewardType === 'discount' && (
          <DealSection 
            title="Direct Discount Deals" 
            deals={filteredDeals.filter(deal => (deal.discount_pct || 0) > 0 && (deal.cashback_pct || 0) === 0)} 
            icon={<Tag className="h-5 w-5 text-destructive" />} 
          />
        )}

        {selectedRewardType === 'cashback' && (
          <DealSection 
            title="Credit Reward Deals" 
            deals={filteredDeals.filter(deal => (deal.cashback_pct || 0) > 0 && (deal.discount_pct || 0) === 0)} 
            icon={<Coins className="h-5 w-5 text-secondary-foreground" />} 
          />
        )}

      </div>
    </div>
  );
};

export default Index;
