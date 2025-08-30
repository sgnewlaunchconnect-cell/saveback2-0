import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserCreditEvent {
  id: string;
  event_type: string;
  local_cents_change: number;
  network_cents_change: number;
  description?: string;
  created_at: string;
  merchant?: {
    id: string;
    name: string;
  };
}

export function useUserCreditEvents(userId?: string, limit = 20) {
  return useQuery({
    queryKey: ['user-credit-events', userId, limit],
    queryFn: async (): Promise<UserCreditEvent[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('credit_events')
        .select(`
          id,
          event_type,
          local_cents_change,
          network_cents_change,
          description,
          created_at,
          merchants:merchant_id (
            id,
            name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching user credit events:', error);
        return [];
      }

      return data?.map(event => ({
        ...event,
        merchant: Array.isArray(event.merchants) ? event.merchants[0] : event.merchants
      })) || [];
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}