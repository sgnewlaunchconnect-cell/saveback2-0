-- Fix security warning: Set proper search_path for existing functions
CREATE OR REPLACE FUNCTION public.process_credit_payment(p_user_id uuid, p_merchant_id uuid, p_original_amount integer, p_local_credits_used integer, p_network_credits_used integer, p_final_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Fix other functions to have proper search_path
CREATE OR REPLACE FUNCTION public.generate_grab_pin()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_pin TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if PIN already exists in active grabs
    SELECT EXISTS(
      SELECT 1 FROM grabs 
      WHERE pin = new_pin 
      AND status = 'ACTIVE' 
      AND expires_at > now()
    ) INTO exists_check;
    
    -- Exit loop if PIN is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_pin;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_grab_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.pin IS NULL OR NEW.pin = '' THEN
    NEW.pin := generate_grab_pin();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into users table if not exists
  INSERT INTO users (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign default user role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'merchant' THEN 2
    WHEN 'user' THEN 3
  END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.increment_group_buy_quantity(group_buy_id uuid, quantity_to_add integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE group_buys 
  SET current_quantity = current_quantity + quantity_to_add,
      updated_at = now()
  WHERE id = group_buy_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payment_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit code
    code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if code already exists in active transactions
    SELECT EXISTS(
      SELECT 1 FROM pending_transactions 
      WHERE payment_code = code 
      AND status = 'pending' 
      AND expires_at > now()
    ) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_payment_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_code IS NULL THEN
    NEW.payment_code := generate_payment_code();
  END IF;
  RETURN NEW;
END;
$$;