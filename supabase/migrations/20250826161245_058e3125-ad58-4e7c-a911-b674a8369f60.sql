-- Fix search_path security warning for merchant staff functions
CREATE OR REPLACE FUNCTION public.get_merchant_staff_role(p_user_id uuid, p_merchant_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ms.role
  FROM merchant_staff ms
  WHERE ms.user_id = p_user_id 
    AND ms.merchant_id = p_merchant_id 
    AND ms.is_active = true
  UNION
  SELECT 'owner'::text
  FROM merchants m
  WHERE m.id = p_merchant_id 
    AND m.owner_id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_merchant_access(p_user_id uuid, p_merchant_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM merchant_staff ms
    WHERE ms.user_id = p_user_id 
      AND ms.merchant_id = p_merchant_id 
      AND ms.is_active = true
    UNION
    SELECT 1 FROM merchants m
    WHERE m.id = p_merchant_id 
      AND m.owner_id = p_user_id
  );
$$;