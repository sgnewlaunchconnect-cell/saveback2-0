-- Allow merchants to view grabs for their deals
CREATE POLICY "Merchants can view grabs for their deals" 
ON grabs 
FOR SELECT 
USING (
  merchant_id IN (
    SELECT id FROM merchants WHERE owner_id = auth.uid()
  )
);

-- Allow admins to view all grabs
CREATE POLICY "Admins can view all grabs" 
ON grabs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));