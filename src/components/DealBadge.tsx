import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tag, Coins } from 'lucide-react';

interface DealBadgeProps {
  discountPct?: number;
  cashbackPct?: number;
  showLabels?: boolean;
}

export const DealBadge: React.FC<DealBadgeProps> = ({ 
  discountPct, 
  cashbackPct, 
  showLabels = false 
}) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {discountPct && discountPct > 0 && (
        <Badge variant="destructive" className="text-xs">
          <Tag className="h-3 w-3 mr-1" />
          {showLabels ? 'Direct Discount' : `${discountPct}% OFF`}
        </Badge>
      )}
      {cashbackPct && cashbackPct > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Coins className="h-3 w-3 mr-1" />
          {showLabels ? 'Credit Rewards' : `${cashbackPct}% back`}
        </Badge>
      )}
    </div>
  );
};

export default DealBadge;