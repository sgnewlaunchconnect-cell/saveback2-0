-- Allow demo users to create live transactions without authentication
ALTER POLICY "Users can create their own live transactions" ON public.live_transactions 
USING (true)
WITH CHECK ((auth.uid() = user_id) OR (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid));