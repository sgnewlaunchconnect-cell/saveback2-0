-- Drop and recreate the INSERT policy for live_transactions to allow demo users
DROP POLICY "Users can create their own live transactions" ON public.live_transactions;

CREATE POLICY "Users can create their own live transactions" ON public.live_transactions
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) OR (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid));