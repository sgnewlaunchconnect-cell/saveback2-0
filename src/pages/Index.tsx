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
  merchant_id: string;
  merchants: {
    id: string;
    name: string;
    address: string;
    category: string;
    logo_url: string;
    payout_method: string;
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
  }, []);

  const fetchDeals = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('deals')
        .select(`
          id, title, description, discount_pct, cashback_pct, reward_mode, 
          end_at, views, grabs, merchant_id,
          merchants(id, name, address, category, logo_url, payout_method)
        `)
        .eq('is_active', true)
        .gt('end_at', now)
        .order('end_at', { ascending: true });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast({
        title: "Error",
        description: "Failed to load deals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter deals based on search and filters
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchTerm === '' || 
      deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.merchants.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRewardType = selectedRewardType === 'all' ||
      (selectedRewardType === 'discount' && deal.discount_pct > 0) ||
      (selectedRewardType === 'cashback' && deal.cashback_pct > 0);

    const matchesCategory = selectedCategory === 'all' ||
      deal.merchants.category === selectedCategory;

    const matchesPaymentType = selectedPaymentType === 'all' ||
      (selectedPaymentType === 'in-app' && deal.merchants.payout_method !== 'manual' && deal.cashback_pct > 0) ||
      (selectedPaymentType === 'pin-only' && (deal.merchants.payout_method === 'manual' || deal.cashback_pct === 0));

    return matchesSearch && matchesRewardType && matchesCategory && matchesPaymentType;
  });

  // Get trending deals (sort by grabs desc, views desc, then end_at asc)
  const trendingDeals = [...filteredDeals]
    .sort((a, b) => {
      if (b.grabs !== a.grabs) return b.grabs - a.grabs;
      if (b.views !== a.views) return b.views - a.views;
      return new Date(a.end_at).getTime() - new Date(b.end_at).getTime();
    })
    .slice(0, 6);

  // Get direct discount deals
  const directDiscountDeals = filteredDeals
    .filter(deal => deal.discount_pct > 0)
    .slice(0, 6);

  // Get credit reward deals
  const creditRewardDeals = filteredDeals
    .filter(deal => deal.cashback_pct > 0)
    .slice(0, 6);

  // Get unique categories
  const categories = ['all', ...new Set(deals.map(deal => deal.merchants.category || 'other'))];

  const DealSection = ({ title, deals, icon }: { title: string; deals: Deal[]; icon: React.ReactNode }) => (
    <div className="space-y-3 animate-fade-in">
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

        {/* Deal Sections - conditionally rendered based on filter */}
        {selectedRewardType === 'all' && (
          <>
            <DealSection 
              title="Trending" 
              deals={trendingDeals} 
              icon={<TrendingUp className="h-5 w-5 text-primary" />} 
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
            deals={filteredDeals.filter(deal => deal.discount_pct > 0)} 
            icon={<Tag className="h-5 w-5 text-destructive" />} 
          />
        )}

        {selectedRewardType === 'cashback' && (
          <DealSection 
            title="Credit Reward Deals" 
            deals={filteredDeals.filter(deal => deal.cashback_pct > 0)} 
            icon={<Coins className="h-5 w-5 text-secondary-foreground" />} 
          />
        )}

      </div>
    </div>
  );
};

export default Index;
