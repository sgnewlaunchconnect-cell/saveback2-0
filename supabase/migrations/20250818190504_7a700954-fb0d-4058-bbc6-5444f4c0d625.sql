-- Create grabs table for deal reservations
CREATE TABLE public.grabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  pin TEXT NOT NULL,
  qr_token TEXT,
  grabbed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grabs ENABLE ROW LEVEL SECURITY;

-- Create policies for grabs
CREATE POLICY "Users can view their own grabs" 
ON public.grabs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grabs" 
ON public.grabs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grabs" 
ON public.grabs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Anonymous users can insert demo grabs" 
ON public.grabs 
FOR INSERT 
WITH CHECK (user_id = '550e8400-e29b-41d4-a716-446655440000'::uuid OR auth.uid() IS NULL);

CREATE POLICY "Merchants can view grabs for their deals" 
ON public.grabs 
FOR SELECT 
USING (merchant_id IN (SELECT id FROM merchants WHERE owner_id = auth.uid()));

-- Create function to generate grab PIN
CREATE OR REPLACE FUNCTION public.generate_grab_pin()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pin TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit PIN
    pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if PIN already exists in active grabs
    SELECT EXISTS(
      SELECT 1 FROM public.grabs 
      WHERE pin = pin 
      AND status = 'ACTIVE' 
      AND expires_at > now()
    ) INTO exists_check;
    
    -- Exit loop if PIN is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN pin;
END;
$$;

-- Create trigger to set PIN on insert
CREATE OR REPLACE FUNCTION public.set_grab_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pin IS NULL OR NEW.pin = '' THEN
    NEW.pin := public.generate_grab_pin();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_grab_pin_trigger
  BEFORE INSERT ON public.grabs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_grab_pin();

-- Add indexes for better performance
CREATE INDEX idx_grabs_user_id ON public.grabs(user_id);
CREATE INDEX idx_grabs_deal_id ON public.grabs(deal_id);
CREATE INDEX idx_grabs_merchant_id ON public.grabs(merchant_id);
CREATE INDEX idx_grabs_status ON public.grabs(status);
CREATE INDEX idx_grabs_expires_at ON public.grabs(expires_at);