-- Create merchant staff table for role-based access
CREATE TABLE public.merchant_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- 'owner', 'manager', 'staff'
  permissions JSONB NOT NULL DEFAULT '{"validate": true, "collect_cash": true, "view_transactions": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(merchant_id, user_id)
);

-- Enable RLS
ALTER TABLE public.merchant_staff ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Owners can manage all staff for their merchants"
ON public.merchant_staff
FOR ALL
USING (
  merchant_id IN (
    SELECT id FROM merchants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Staff can view their own records"
ON public.merchant_staff
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check merchant staff role
CREATE OR REPLACE FUNCTION public.get_merchant_staff_role(p_user_id uuid, p_merchant_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- Create function to check if user has merchant access
CREATE OR REPLACE FUNCTION public.has_merchant_access(p_user_id uuid, p_merchant_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- Create trigger for updated_at
CREATE TRIGGER update_merchant_staff_updated_at
  BEFORE UPDATE ON public.merchant_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();