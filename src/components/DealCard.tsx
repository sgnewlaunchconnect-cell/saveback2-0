import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getUserId } from '@/utils/userIdManager';
import DealBadge from './DealBadge';

interface Deal {
  id: string;
  title: string;
  description?: string;
  discount_pct?: number;
  cashback_pct?: number;
  end_at: string;
  merchant_id: string;
  merchants: {
    id: string;
    name: string;
    address?: string;
    logo_url?: string;
  };
}

interface DealCardProps {
  deal: Deal;
  compact?: boolean;
}

export const DealCard: React.FC<DealCardProps> = ({ deal, compact = false }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGrabDeal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const anonymousUserId = getUserId();
      
      const { data, error } = await supabase.functions.invoke('createGrab', {
        body: {
          dealId: deal.id,
          anonymousUserId
        }
      });

      if (error) throw error;

      toast({
        title: "Deal Grabbed!",
        description: "Redirecting to payment...",
      });

      // Navigate to grab pass page with useNow=true to start payment immediately
      navigate(`/grab-pass/${data.grab.id}?useNow=true`);
    } catch (error) {
      console.error('Error grabbing deal:', error);
      toast({
        title: "Error",
        description: "Failed to grab deal. Please try again.",
        variant: "destructive"
      });
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
    
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    if (minutes > 0) return `${minutes}m left`;
    return 'Soon';
  };

  const isExpiringSoon = (endAt: string) => {
    const now = new Date();
    const end = new Date(endAt);
    const diff = end.getTime() - now.getTime();
    return diff <= 6 * 60 * 60 * 1000; // 6 hours
  };

  const getTotalSavings = () => {
    const discount = deal.discount_pct || 0;
    const cashback = deal.cashback_pct || 0;
    return discount + cashback;
  };

  return (
    <Card 
      className={`group cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${
        isExpiringSoon(deal.end_at) 
          ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50' 
          : 'hover:shadow-primary/5'
      } overflow-hidden`}
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          {/* Header with merchant info */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {deal.merchants.logo_url ? (
                <img 
                  src={deal.merchants.logo_url} 
                  alt={deal.merchants.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                {deal.title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/merchant/${deal.merchant_id}`);
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer text-left truncate"
              >
                {deal.merchants.name}
              </button>
            </div>
          </div>
          
          {/* Deal badges positioned below header */}
          <div className="flex flex-wrap items-center gap-2">
            <DealBadge 
              discountPct={deal.discount_pct} 
              cashbackPct={deal.cashback_pct} 
            />
          </div>
          
          {/* Location */}
          {deal.merchants.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{deal.merchants.address}</span>
            </div>
          )}
          
          {/* Time and savings benefit */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span className={isExpiringSoon(deal.end_at) ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                {getTimeLeft(deal.end_at)}
              </span>
            </div>
            {getTotalSavings() > 0 && (
              <div className="text-xs text-primary font-medium">
                Save up to {getTotalSavings()}%
              </div>
            )}
          </div>

          {/* Benefit message */}
          {(deal.discount_pct > 0 || deal.cashback_pct > 0) && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              {deal.discount_pct > 0 && deal.cashback_pct > 0 
                ? `Get ${deal.discount_pct}% instant discount + earn ${deal.cashback_pct}% credits`
                : deal.discount_pct > 0 
                ? `Get ${deal.discount_pct}% instant discount`
                : `Earn ${deal.cashback_pct}% credits back`
              }
            </div>
          )}

          {/* CTA Button - Right aligned and smaller */}
          <div className="flex justify-end">
            <Button 
              onClick={handleGrabDeal}
              variant="cta"
              size="sm"
              
            >
              Grab Deal
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DealCard;