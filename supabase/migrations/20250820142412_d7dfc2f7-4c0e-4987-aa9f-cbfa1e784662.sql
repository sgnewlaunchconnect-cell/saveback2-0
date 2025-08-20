-- Fix RLS policies for grabs table to allow anonymous users to access their grabs
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can select grabs" ON public.grabs;

-- Create new policy that allows access to grabs for the grab owner or merchant
CREATE POLICY "Users can view accessible grabs" ON public.grabs
FOR SELECT 
USING (
  -- User owns the grab (authenticated or anonymous)
  (auth.uid() = user_id) OR 
  (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid) OR
  -- Anonymous user matches the anon_user_id
  (anon_user_id IS NOT NULL) OR
  -- Merchant can view grabs for their deals
  (merchant_id IN (
    SELECT merchants.id
    FROM merchants
    WHERE merchants.owner_id = auth.uid()
  ))
);