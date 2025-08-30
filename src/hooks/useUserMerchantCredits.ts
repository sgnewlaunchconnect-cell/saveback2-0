import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserMerchantCredit {
  id: string;
  merchant_id: string;
  local_cents: number;
  network_cents: number;
  merchant?: {
    id: string;
    name: string;
    category: string;
    logo_url?: string;
  };
}

export function useUserMerchantCredits(userId?: string) {
  return useQuery({
    queryKey: ['user-merchant-credits', userId],
    queryFn: async (): Promise<UserMerchantCredit[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('credits')
        .select(`
          id,
          merchant_id,
          local_cents,
          network_cents,
          merchants:merchant_id (
            id,
            name,
            category,
            logo_url
          )
        `)
        .eq('user_id', userId)
        .gt('local_cents', 0)
        .or('network_cents.gt.0')
        .order('local_cents', { ascending: false });

      if (error) {
        console.error('Error fetching user merchant credits:', error);
        return [];
      }

      return data?.map(credit => ({
        ...credit,
        merchant: Array.isArray(credit.merchants) ? credit.merchants[0] : credit.merchants
      })) || [];
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}