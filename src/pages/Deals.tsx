import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, List, Map as MapIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  cashback_pct: number;
  end_at: string;
  merchant_id: string;
  merchants: {
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
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          merchants (
            name,
            address,
            latitude,
            longitude
          )
        `)
        .eq('is_active', true)
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
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Ending soon';
  };

  const openDealDetail = (dealId: string) => {
    navigate(`/deals/${dealId}`);
  };

  const DealCard = ({ deal }: { deal: Deal }) => (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => openDealDetail(deal.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{deal.title}</CardTitle>
          <div className="flex gap-2">
            {deal.discount_pct && (
              <Badge variant="destructive">{deal.discount_pct}% OFF</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{deal.merchants.name}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{getTimeLeft(deal.end_at)}</span>
            </div>
            {deal.cashback_pct && (
              <Badge variant="secondary" className="text-xs">
                {deal.cashback_pct}% back
              </Badge>
            )}
          </div>
        </div>
        {deal.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {deal.description}
          </p>
        )}
      </CardContent>
    </Card>
  );

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
          <h1 className="text-2xl font-bold">Deals Nearby</h1>
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
                  <p className="text-muted-foreground">No deals found nearby</p>
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