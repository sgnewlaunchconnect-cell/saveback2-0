import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Grab } from 'lucide-react';
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
  merchants: {
    id: string;
    name: string;
    address?: string;
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
      navigate(`/grab/${data.grab.id}?useNow=true`);
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

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all animate-fade-in ${
        isExpiringSoon(deal.end_at) 
          ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20' 
          : ''
      }`}
      onClick={() => navigate(`/deals/${deal.id}`)}
    >
      <CardHeader className={compact ? "pb-2" : "pb-3"}>
        <div className="flex justify-between items-start gap-3">
          <CardTitle className={`${compact ? 'text-base' : 'text-lg'} line-clamp-2`}>
            {deal.title}
          </CardTitle>
          <DealBadge 
            discountPct={deal.discount_pct} 
            cashbackPct={deal.cashback_pct} 
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/merchant/${deal.merchants.id}`);
            }}
            className="hover:text-primary transition-colors cursor-pointer text-left underline text-primary font-medium"
          >
            {deal.merchants.name}
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex justify-between items-center">
          <div className={`flex items-center gap-1 text-sm ${
            isExpiringSoon(deal.end_at) 
              ? 'text-orange-600 font-medium' 
              : 'text-muted-foreground'
          }`}>
            <Clock className="h-4 w-4" />
            <span>{getTimeLeft(deal.end_at)}</span>
          </div>
        </div>
        {deal.description && !compact && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {deal.description}
          </p>
        )}
        <Button 
          onClick={handleGrabDeal}
          className="w-full"
          size="sm"
        >
          <Grab className="h-4 w-4 mr-2" />
          Grab Deal Now
        </Button>
      </CardContent>
    </Card>
  );
};

export default DealCard;