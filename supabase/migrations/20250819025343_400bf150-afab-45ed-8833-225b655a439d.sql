-- Fix RLS policy to allow demo grabs for both anonymous and authenticated users
DROP POLICY IF EXISTS "Anonymous users can insert demo grabs" ON public.grabs;

CREATE POLICY "Allow demo grabs for all users" 
ON public.grabs 
FOR INSERT 
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid);