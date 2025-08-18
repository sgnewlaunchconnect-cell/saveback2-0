-- Create credits table for user credit accumulation
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  local_cents INTEGER NOT NULL DEFAULT 0,
  network_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, merchant_id)
);

-- Enable RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own credits
CREATE POLICY "Users can view their own credits" 
ON public.credits 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own credits (for system operations)
CREATE POLICY "Users can insert their own credits" 
ON public.credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own credits (for system operations)
CREATE POLICY "Users can update their own credits" 
ON public.credits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create events table for credit transactions logging
CREATE TABLE IF NOT EXISTS public.credit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  grab_id UUID,
  event_type TEXT NOT NULL DEFAULT 'CREDIT_EARNED',
  local_cents_change INTEGER NOT NULL DEFAULT 0,
  network_cents_change INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for events
ALTER TABLE public.credit_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own credit events
CREATE POLICY "Users can view their own credit events" 
ON public.credit_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert credit events
CREATE POLICY "System can insert credit events" 
ON public.credit_events 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates on credits
CREATE TRIGGER update_credits_updated_at
BEFORE UPDATE ON public.credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();