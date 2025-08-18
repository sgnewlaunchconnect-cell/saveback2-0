-- Create function to process credit payments atomically
CREATE OR REPLACE FUNCTION public.process_credit_payment(
  p_user_id uuid,
  p_merchant_id uuid,
  p_original_amount integer,
  p_local_credits_used integer,
  p_network_credits_used integer,
  p_final_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_local_credits integer;
  v_current_network_credits integer;
  v_total_network_credits integer;
BEGIN
  -- Get current credit balance for this merchant
  SELECT local_cents, network_cents 
  INTO v_current_local_credits, v_current_network_credits
  FROM credits
  WHERE user_id = p_user_id AND merchant_id = p_merchant_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO credits (user_id, merchant_id, local_cents, network_cents)
    VALUES (p_user_id, p_merchant_id, 0, 0);
    v_current_local_credits := 0;
    v_current_network_credits := 0;
  END IF;

  -- Get total network credits across all merchants
  SELECT COALESCE(SUM(network_cents), 0)
  INTO v_total_network_credits
  FROM credits
  WHERE user_id = p_user_id;

  -- Verify sufficient credits
  IF p_local_credits_used > v_current_local_credits THEN
    RAISE EXCEPTION 'Insufficient local credits. Available: %, Requested: %', 
      v_current_local_credits, p_local_credits_used;
  END IF;

  IF p_network_credits_used > v_total_network_credits THEN
    RAISE EXCEPTION 'Insufficient network credits. Available: %, Requested: %', 
      v_total_network_credits, p_network_credits_used;
  END IF;

  -- Update local credits for this merchant
  UPDATE credits
  SET 
    local_cents = local_cents - p_local_credits_used,
    updated_at = now()
  WHERE user_id = p_user_id AND merchant_id = p_merchant_id;

  -- Deduct network credits proportionally across all merchants that have them
  IF p_network_credits_used > 0 THEN
    -- Update network credits proportionally across merchants
    UPDATE credits
    SET 
      network_cents = GREATEST(0, 
        network_cents - FLOOR(
          (network_cents::float / v_total_network_credits::float) * p_network_credits_used
        )
      ),
      updated_at = now()
    WHERE user_id = p_user_id AND network_cents > 0;
  END IF;

  -- Update user totals
  UPDATE users
  SET 
    local_credits = local_credits - p_local_credits_used,
    network_credits = network_credits - p_network_credits_used,
    total_redemptions = total_redemptions + 1,
    total_savings = total_savings + (p_local_credits_used + p_network_credits_used)
  WHERE user_id = p_user_id;

END;
$$;