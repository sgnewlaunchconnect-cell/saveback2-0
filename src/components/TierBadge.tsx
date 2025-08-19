import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Trophy, Medal } from 'lucide-react';

interface TierBadgeProps {
  tier: string;
  points: number;
  className?: string;
  showPoints?: boolean;
}

const tierConfig = {
  Bronze: {
    icon: Medal,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    gradient: 'from-amber-400 to-amber-600',
    threshold: 0
  },
  Silver: {
    icon: Star,
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    gradient: 'from-slate-400 to-slate-600',
    threshold: 20
  },
  Gold: {
    icon: Trophy,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    gradient: 'from-yellow-400 to-yellow-600',
    threshold: 50
  },
  Platinum: {
    icon: Crown,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    gradient: 'from-purple-400 to-purple-600',
    threshold: 100
  }
};

export const TierBadge: React.FC<TierBadgeProps> = ({ 
  tier, 
  points, 
  className = '', 
  showPoints = false 
}) => {
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.Bronze;
  const Icon = config.icon;

  const getNextTierInfo = () => {
    const tiers = Object.entries(tierConfig).sort((a, b) => a[1].threshold - b[1].threshold);
    const currentIndex = tiers.findIndex(([t]) => t === tier);
    
    if (currentIndex < tiers.length - 1) {
      const nextTier = tiers[currentIndex + 1];
      return {
        name: nextTier[0],
        pointsNeeded: nextTier[1].threshold - points
      };
    }
    return null;
  };

  const nextTier = getNextTierInfo();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className={`${config.color} flex items-center gap-1 font-medium`}>
        <Icon className="w-3 h-3" />
        {tier}
      </Badge>
      
      {showPoints && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">{points}</span> pts
          {nextTier && (
            <span className="ml-1">
              • {nextTier.pointsNeeded} to {nextTier.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TierBadge;