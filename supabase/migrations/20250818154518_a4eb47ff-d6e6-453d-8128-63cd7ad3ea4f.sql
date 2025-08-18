-- Create real-time transaction states table
CREATE TABLE public.live_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  deal_id UUID,
  qr_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting_merchant_scan',
  
  -- Purchase details entered by merchant
  purchase_amount NUMERIC,
  
  -- Calculated amounts
  deal_discount NUMERIC DEFAULT 0,
  credits_available_local NUMERIC DEFAULT 0,
  credits_available_network NUMERIC DEFAULT 0,
  credits_to_apply NUMERIC DEFAULT 0,
  net_amount NUMERIC,
  
  -- User preferences
  credits_enabled BOOLEAN DEFAULT true,
  
  -- Deal information
  deal_title TEXT,
  deal_discount_pct NUMERIC,
  deal_discount_fixed NUMERIC,
  deal_type TEXT, -- 'percentage', 'fixed', 'bogo', etc.
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '10 minutes')
);

-- Enable RLS
ALTER TABLE public.live_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own live transactions" 
ON public.live_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own live transactions" 
ON public.live_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own live transactions" 
ON public.live_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Merchants can view live transactions for their deals" 
ON public.live_transactions 
FOR SELECT 
USING (merchant_id IN (
  SELECT merchants.id FROM merchants 
  WHERE merchants.owner_id = auth.uid()
));

CREATE POLICY "Merchants can update live transactions for their deals" 
ON public.live_transactions 
FOR UPDATE 
USING (merchant_id IN (
  SELECT merchants.id FROM merchants 
  WHERE merchants.owner_id = auth.uid()
));

-- Create updated_at trigger
CREATE TRIGGER update_live_transactions_updated_at
BEFORE UPDATE ON public.live_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER TABLE public.live_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_transactions;

-- Create function to calculate transaction totals
CREATE OR REPLACE FUNCTION public.calculate_transaction_totals(
  p_transaction_id UUID,
  p_purchase_amount NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deal_discount NUMERIC := 0;
  v_credits_local NUMERIC := 0;
  v_credits_network NUMERIC := 0;
  v_credits_to_apply NUMERIC := 0;
  v_net_amount NUMERIC;
  v_transaction RECORD;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction 
  FROM live_transactions 
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Calculate deal discount
  IF v_transaction.deal_type = 'percentage' AND v_transaction.deal_discount_pct IS NOT NULL THEN
    v_deal_discount := p_purchase_amount * (v_transaction.deal_discount_pct / 100);
  ELSIF v_transaction.deal_type = 'fixed' AND v_transaction.deal_discount_fixed IS NOT NULL THEN
    v_deal_discount := LEAST(v_transaction.deal_discount_fixed, p_purchase_amount);
  END IF;
  
  -- Get available credits if credits are enabled
  IF v_transaction.credits_enabled THEN
    SELECT 
      COALESCE(local_cents, 0) / 100.0,
      COALESCE(network_cents, 0) / 100.0
    INTO v_credits_local, v_credits_network
    FROM credits 
    WHERE user_id = v_transaction.user_id 
    AND merchant_id = v_transaction.merchant_id;
    
    -- Calculate credits to apply (max available, not exceeding remaining amount)
    v_credits_to_apply := LEAST(
      v_credits_local + v_credits_network,
      p_purchase_amount - v_deal_discount
    );
  END IF;
  
  -- Calculate net amount
  v_net_amount := GREATEST(0, p_purchase_amount - v_deal_discount - v_credits_to_apply);
  
  -- Update transaction
  UPDATE live_transactions SET
    purchase_amount = p_purchase_amount,
    deal_discount = v_deal_discount,
    credits_available_local = v_credits_local,
    credits_available_network = v_credits_network,
    credits_to_apply = v_credits_to_apply,
    net_amount = v_net_amount,
    updated_at = now()
  WHERE id = p_transaction_id;
END;
$function$;