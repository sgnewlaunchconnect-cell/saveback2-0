import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Gift, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface GrabData {
  id: string;
  pin: string;
  expires_at: string;
  status: string;
  deal: {
    id: string;
    title: string;
    discount_pct: number;
    cashback_pct: number;
    merchant: {
      id: string;
      name: string;
      address: string;
    };
  };
}

const Redeem = () => {
  const [grabs, setGrabs] = useState<GrabData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGrabs();
  }, []);

  const fetchGrabs = async () => {
    try {
      // Get anonymous user ID from localStorage
      const anonymousUserId = localStorage.getItem('anonymousUserId');
      if (!anonymousUserId) {
        setLoading(false);
        return;
      }

      // Get grabs first
      const { data: grabsData, error: grabsError } = await supabase
        .from('grabs')
        .select('id, pin, expires_at, status, deal_id')
        .eq('user_id', anonymousUserId)
        .eq('status', 'ACTIVE')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (grabsError) throw grabsError;

      if (!grabsData || grabsData.length === 0) {
        setGrabs([]);
        return;
      }

      // Get deal details for each grab
      const dealIds = grabsData.map(grab => grab.deal_id);
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          discount_pct,
          cashback_pct,
          merchants (
            id,
            name,
            address
          )
        `)
        .in('id', dealIds);

      if (dealsError) throw dealsError;

      // Combine grabs with deal data
      const formattedGrabs = grabsData.map(grab => {
        const deal = dealsData?.find(d => d.id === grab.deal_id);
        return {
          id: grab.id,
          pin: grab.pin,
          expires_at: grab.expires_at,
          status: grab.status,
          deal: {
            id: deal?.id || '',
            title: deal?.title || 'Unknown Deal',
            discount_pct: deal?.discount_pct || 0,
            cashback_pct: deal?.cashback_pct || 0,
            merchant: {
              id: deal?.merchants?.id || '',
              name: deal?.merchants?.name || 'Unknown Merchant',
              address: deal?.merchants?.address || '',
            }
          }
        };
      });

      setGrabs(formattedGrabs);
    } catch (error) {
      console.error('Error fetching grabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const end = new Date(expiresAt);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    if (minutes > 0) return `${minutes}m left`;
    return 'Expiring soon';
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const end = new Date(expiresAt);
    const diff = end.getTime() - now.getTime();
    return diff <= 6 * 60 * 60 * 1000; // 6 hours
  };

  const openGrabPass = (grabId: string) => {
    navigate(`/grab-pass/${grabId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">My Deals</h1>
          <div className="space-y-4">
            {[1, 2].map((i) => (
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Deals</h1>
          <p className="text-muted-foreground text-sm">
            Your grabbed deals ready to redeem
          </p>
        </div>

        <div className="space-y-4">
          {grabs.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No deals grabbed yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Browse deals and grab the ones you like
              </p>
              <Button onClick={() => navigate('/deals')}>
                Browse Deals
              </Button>
            </div>
          ) : (
            grabs.map((grab) => (
              <Card 
                key={grab.id}
                className={`cursor-pointer hover:shadow-md transition-all ${
                  isExpiringSoon(grab.expires_at) 
                    ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20' 
                    : ''
                }`}
                onClick={() => openGrabPass(grab.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-2">{grab.deal.title}</CardTitle>
                    <div className="flex gap-2">
                      {grab.deal.discount_pct && (
                        <Badge variant="destructive">{grab.deal.discount_pct}% OFF</Badge>
                      )}
                      {isExpiringSoon(grab.expires_at) && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Expiring Soon
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/merchant/${grab.deal.merchant.id}`);
                      }}
                      className="hover:text-primary transition-colors cursor-pointer text-left underline text-primary font-medium"
                    >
                      {grab.deal.merchant.name}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1 text-sm ${
                        isExpiringSoon(grab.expires_at) 
                          ? 'text-orange-600 font-medium' 
                          : 'text-muted-foreground'
                      }`}>
                        <Clock className="h-4 w-4" />
                        <span>{getTimeLeft(grab.expires_at)}</span>
                      </div>
                      {grab.deal.cashback_pct && (
                        <Badge variant="secondary" className="text-xs">
                          {grab.deal.cashback_pct}% back
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      Open Pass
                    </Button>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      PIN: <span className="font-mono font-bold">{grab.pin}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Redeem;