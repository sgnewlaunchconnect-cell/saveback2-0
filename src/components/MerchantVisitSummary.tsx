import { Wallet, Clock, Coins } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMerchantCredits } from '@/hooks/useMerchantCredits';
import { useLastVisit } from '@/hooks/useLastVisit';
import { formatCurrencyDisplay } from '@/utils/currency';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

interface MerchantVisitSummaryProps {
  merchantId: string;
}

export function MerchantVisitSummary({ merchantId }: MerchantVisitSummaryProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setIsAuthenticated(!!user);
    };
    
    getUser();
  }, []);

  const { data: credits, isLoading: creditsLoading } = useMerchantCredits(merchantId, userId || undefined);
  const { data: lastVisit, isLoading: visitLoading } = useLastVisit(merchantId, userId || undefined);

  // Don't show anything if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const isLoading = creditsLoading || visitLoading;

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Your Status</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-5 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalNetworkCredits = credits?.network_cents || 0;
  const localCredits = credits?.local_cents || 0;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Your Status</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Coins className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Local Credits</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrencyDisplay(localCredits)}
            </p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Coins className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Network Credits</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrencyDisplay(totalNetworkCredits)}
            </p>
          </div>
        </div>

        {lastVisit && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Last Visit</span>
            </div>
            <p className="text-sm text-foreground">
              {new Date(lastVisit.date).toLocaleDateString()}
              {lastVisit.amount > 0 && (
                <span className="text-muted-foreground ml-1">
                  • {formatCurrencyDisplay(lastVisit.amount)}
                </span>
              )}
            </p>
          </div>
        )}

        {!lastVisit && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Last Visit</span>
            </div>
            <p className="text-sm text-muted-foreground">
              First time visiting
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}