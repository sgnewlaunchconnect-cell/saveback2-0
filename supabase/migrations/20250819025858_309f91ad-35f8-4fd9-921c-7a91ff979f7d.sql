-- Comprehensive fix for grabs RLS policies
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can create their own grabs" ON public.grabs;
DROP POLICY IF EXISTS "Users can view their own grabs" ON public.grabs;
DROP POLICY IF EXISTS "Users can update their own grabs" ON public.grabs;
DROP POLICY IF EXISTS "Allow demo grabs for all users" ON public.grabs;
DROP POLICY IF EXISTS "Merchants can view grabs for their deals" ON public.grabs;

-- Create unified policies that work for both authenticated and demo users
CREATE POLICY "Users can insert grabs" 
ON public.grabs 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
);

CREATE POLICY "Users can select grabs" 
ON public.grabs 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid OR
  merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid())
);

CREATE POLICY "Users can update grabs" 
ON public.grabs 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
);