import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingTransaction {
  id: string;
  payment_code: string;
  original_amount: number;
  final_amount: number;
  customer_selected_local_credits: number;
  customer_selected_network_credits: number;
  live_net_amount: number | null;
  customer_credit_selection_at: string | null;
  status: string;
  expires_at: string;
  merchant_id: string;
}

export function useRealtimePendingTransaction(paymentCode?: string) {
  const [transaction, setTransaction] = useState<PendingTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentCode) {
      setTransaction(null);
      return;
    }

    let channel: any;

    const fetchTransaction = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('pending_transactions')
          .select('*')
          .eq('payment_code', paymentCode)
          .single();

        if (fetchError) {
          setError('Transaction not found');
          setTransaction(null);
        } else {
          setTransaction(data);
        }
      } catch (err) {
        setError('Failed to fetch transaction');
        setTransaction(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchTransaction();

    // Set up realtime subscription
    channel = supabase
      .channel('pending_transaction_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_transactions',
          filter: `payment_code=eq.${paymentCode}`
        },
        (payload) => {
          console.log('Real-time transaction update:', payload);
          setTransaction(payload.new as PendingTransaction);
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [paymentCode]);

  return { transaction, isLoading, error };
}