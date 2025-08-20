import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Clock, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getUserId } from '@/utils/userIdManager';
import DealBadge from '@/components/DealBadge';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';

interface DealDetail {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  cashback_pct: number;
  end_at: string;
  start_at: string;
  stock?: number;
  redemptions?: number;
  merchant_id: string;
  merchants: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    payout_method?: string;
  };
}

const DealDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [grabbing, setGrabbing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDealDetail(id);
    }
  }, [id]);

  const fetchDealDetail = async (dealId: string) => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
           merchants (
             name,
             address,
             latitude,
             longitude,
             phone,
             payout_method
           )
        `)
        .eq('id', dealId)
        .single();

      if (error) throw error;
      setDeal(data);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast({
        title: "Error",
        description: "Failed to load deal details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrab = async () => {
    if (!deal) return;
    
    setGrabbing(true);
    try {
      // Use consistent getUserId helper
      const anonymousUserId = getUserId();

      // Use createGrab edge function to ensure proper expiry and validation
      const { data, error } = await supabase.functions.invoke('createGrab', {
        body: { dealId: deal.id, anonymousUserId }
      });

      if (error) throw error;

      toast({
        title: "Deal Grabbed! 🎉",
        description: "Deal reserved successfully. Check 'Redeem' tab to use it."
      });

      // Navigate to redeem page to show grabbed deal
      navigate(`/redeem`);
    } catch (error) {
      console.error('Error grabbing deal:', error);
      toast({
        title: "Error",
        description: "Failed to grab deal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGrabbing(false);
    }
  };

  const getTimeLeft = (endAt: string) => {
    const now = new Date();
    const end = new Date(endAt);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} days left`;
    if (hours > 0) return `${hours} hours left`;
    return 'Ending soon';
  };

  const isExpired = (endAt: string) => {
    return new Date(endAt) <= new Date();
  };

  const isSoldOut = () => {
    if (!deal?.stock || deal.stock <= 0) return false;
    const redemptions = deal.redemptions || 0;
    return redemptions >= deal.stock;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="h-8 bg-muted rounded animate-pulse mb-6" />
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-20 bg-muted rounded animate-pulse" />
            <div className="h-12 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <Button 
            variant="ghost" 
          onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Deal not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="space-y-3">
              <CardTitle className="text-xl leading-tight">{deal.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <DealBadge 
                  discountPct={deal.discount_pct} 
                  cashbackPct={deal.cashback_pct} 
                />
                <PaymentMethodBadge 
                  payoutMethod={deal.merchants.payout_method}
                  hasCashback={!!deal.cashback_pct && deal.cashback_pct > 0}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/merchants/${deal.merchant_id}`);
                    }}
                    className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer text-left underline"
                  >
                    {deal.merchants.name}
                  </button>
                  <p>{deal.merchants.address}</p>
                  {deal.merchants.phone && <p>📞 {deal.merchants.phone}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className={isExpired(deal.end_at) ? 'text-destructive' : 'text-muted-foreground'}>
                  {getTimeLeft(deal.end_at)}
                </span>
              </div>

              {deal.description && (
                <div>
                  <h3 className="font-medium mb-2">About this deal</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {deal.description}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button 
          variant="cta"
          className="w-full h-12 text-lg font-semibold"
          onClick={handleGrab}
          disabled={grabbing || isExpired(deal.end_at) || isSoldOut()}
        >
          {grabbing ? 'Grabbing...' : 
           isSoldOut() ? 'Sold Out' :
           isExpired(deal.end_at) ? 'Deal Expired' : 'Grab This Deal'}
        </Button>

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Show your grabbed deal at the merchant to redeem
          </p>
        </div>
      </div>
    </div>
  );
};

export default DealDetail;