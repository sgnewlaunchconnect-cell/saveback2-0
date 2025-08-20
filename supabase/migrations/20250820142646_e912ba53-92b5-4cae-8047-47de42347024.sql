-- Temporarily make grabs more accessible for demo purposes
DROP POLICY IF EXISTS "Users can view accessible grabs" ON public.grabs;

-- Create a more permissive policy for demo
CREATE POLICY "Demo grabs access" ON public.grabs
FOR SELECT 
USING (true); -- Allow all access for demo purposes

-- Also ensure the getGrab function can read the data
GRANT SELECT ON public.grabs TO anon;
GRANT SELECT ON public.deals TO anon;
GRANT SELECT ON public.merchants TO anon;