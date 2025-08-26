import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MerchantCredits {
  local_cents: number;
  network_cents: number;
}

export function useMerchantCredits(merchantId: string, userId?: string) {
  return useQuery({
    queryKey: ['merchant-credits', merchantId, userId],
    queryFn: async (): Promise<MerchantCredits> => {
      if (!userId) {
        return { local_cents: 0, network_cents: 0 };
      }

      const { data, error } = await supabase
        .from('credits')
        .select('local_cents, network_cents')
        .eq('user_id', userId)
        .eq('merchant_id', merchantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching merchant credits:', error);
        return { local_cents: 0, network_cents: 0 };
      }

      return data || { local_cents: 0, network_cents: 0 };
    },
    enabled: !!merchantId,
    staleTime: 30000, // 30 seconds
  });
}