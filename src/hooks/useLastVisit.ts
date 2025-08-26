import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LastVisit {
  date: string;
  amount: number;
}

export function useLastVisit(merchantId: string, userId?: string) {
  return useQuery({
    queryKey: ['last-visit', merchantId, userId],
    queryFn: async (): Promise<LastVisit | null> => {
      if (!userId) {
        return null;
      }

      // Check pending_transactions first for completed payments
      const { data: transactions, error: transError } = await supabase
        .from('pending_transactions')
        .select('captured_at, final_amount')
        .eq('user_id', userId)
        .eq('merchant_id', merchantId)
        .eq('status', 'completed')
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!transError && transactions && transactions.captured_at) {
        return {
          date: transactions.captured_at,
          amount: Math.round(parseFloat(transactions.final_amount.toString()) * 100), // Convert to cents
        };
      }

      // Fallback to grabs table for deal redemptions
      const { data: grabs, error: grabError } = await supabase
        .from('grabs')
        .select('used_at')
        .eq('user_id', userId)
        .eq('merchant_id', merchantId)
        .eq('status', 'USED')
        .order('used_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (grabError || !grabs || !grabs.used_at) {
        return null;
      }

      return {
        date: grabs.used_at,
        amount: 0, // Deal redemptions don't have explicit amounts
      };
    },
    enabled: !!merchantId && !!userId,
    staleTime: 60000, // 1 minute
  });
}