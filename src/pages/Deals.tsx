import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, Map as MapIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import DealCard from '@/components/DealCard';

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  cashback_pct: number;
  end_at: string;
  merchant_id: string;
  merchants: {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

const Deals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      // Get current time and 48 hours from now
      const now = new Date();
      const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          merchants (
            id,
            name,
            address,
            latitude,
            longitude
          )
        `)
        .eq('is_active', true)
        .gt('end_at', now.toISOString()) // Only non-expired deals
        .lt('end_at', fortyEightHoursFromNow.toISOString()) // Only deals ending within 48 hours
        .order('end_at', { ascending: true });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeLeft = (endAt: string) => {
    const now = new Date();
    const end = new Date(endAt);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    if (minutes > 0) return `${minutes}m left`;
    return 'Ending soon';
  };

  const isExpiringSoon = (endAt: string) => {
    const now = new Date();
    const end = new Date(endAt);
    const diff = end.getTime() - now.getTime();
    return diff <= 6 * 60 * 60 * 1000; // 6 hours
  };

  const openDealDetail = (dealId: string) => {
    navigate(`/deals/${dealId}`);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Deals Nearby</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Ending Soon</h1>
            <p className="text-sm text-muted-foreground">Deals ending within 48 hours</p>
          </div>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'map')}>
            <TabsList className="grid grid-cols-2 w-24">
              <TabsTrigger value="list" className="p-2">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="map" className="p-2">
                <MapIcon className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={viewMode} className="w-full">
          <TabsContent value="list" className="mt-0">
            <div className="space-y-4">
              {deals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No urgent deals found</p>
                  <p className="text-sm text-muted-foreground mt-1">Check back later for new deals ending soon</p>
                </div>
              ) : (
                deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="map" className="mt-0">
            <div className="bg-muted rounded-lg h-96 flex items-center justify-center">
              <p className="text-muted-foreground">Map view coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Deals;