-- Enable realtime for pending_transactions table
ALTER TABLE public.pending_transactions REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_transactions;

-- Add real-time credit selection fields to pending_transactions
ALTER TABLE public.pending_transactions 
ADD COLUMN customer_selected_local_credits integer DEFAULT 0,
ADD COLUMN customer_selected_network_credits integer DEFAULT 0,
ADD COLUMN live_net_amount integer DEFAULT NULL,
ADD COLUMN customer_credit_selection_at timestamp with time zone DEFAULT NULL;