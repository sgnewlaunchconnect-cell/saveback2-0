-- Create grabs table for secure grab flow
CREATE TABLE IF NOT EXISTS public.grabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'LOCKED',
  pin TEXT NOT NULL,
  qr_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grabs ENABLE ROW LEVEL SECURITY;

-- Users can view their own grabs
CREATE POLICY "Users can view their own grabs" 
ON public.grabs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own grabs
CREATE POLICY "Users can create their own grabs" 
ON public.grabs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Merchants can view grabs for their deals
CREATE POLICY "Merchants can view grabs for their deals" 
ON public.grabs 
FOR SELECT 
USING (merchant_id IN (
  SELECT merchants.id 
  FROM merchants 
  WHERE merchants.owner_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_grabs_updated_at
BEFORE UPDATE ON public.grabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();