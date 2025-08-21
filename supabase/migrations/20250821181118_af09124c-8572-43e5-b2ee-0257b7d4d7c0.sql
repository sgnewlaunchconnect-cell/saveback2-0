-- Add moderation fields to reviews table
ALTER TABLE public.reviews 
ADD COLUMN is_hidden boolean NOT NULL DEFAULT false,
ADD COLUMN hidden_reason text,
ADD COLUMN hidden_by uuid;

-- Create review_flags table for merchant objections
CREATE TABLE public.review_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL,
  merchant_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_by uuid,
  resolved_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on review_flags
ALTER TABLE public.review_flags ENABLE ROW LEVEL SECURITY;

-- Create merchant_settlements table for payment tracking
CREATE TABLE public.merchant_settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_cents integer NOT NULL DEFAULT 0,
  fees_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_reference text,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);

-- Enable RLS on merchant_settlements
ALTER TABLE public.merchant_settlements ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for review_flags
CREATE TRIGGER update_review_flags_updated_at
BEFORE UPDATE ON public.review_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for merchant_settlements
CREATE TRIGGER update_merchant_settlements_updated_at
BEFORE UPDATE ON public.merchant_settlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for reviews (admin can update any review)
CREATE POLICY "Admins can update any review" 
ON public.reviews 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for review_flags
CREATE POLICY "Merchants can view their own review flags" 
ON public.review_flags 
FOR SELECT 
USING (merchant_id IN (
  SELECT id FROM merchants WHERE owner_id = auth.uid()
));

CREATE POLICY "Merchants can insert review flags for their reviews" 
ON public.review_flags 
FOR INSERT 
WITH CHECK (merchant_id IN (
  SELECT id FROM merchants WHERE owner_id = auth.uid()
));

CREATE POLICY "Admins can manage all review flags" 
ON public.review_flags 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for merchant_settlements
CREATE POLICY "Admins can manage all settlements" 
ON public.merchant_settlements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Merchants can view their own settlements" 
ON public.merchant_settlements 
FOR SELECT 
USING (merchant_id IN (
  SELECT id FROM merchants WHERE owner_id = auth.uid()
));

-- Update users table RLS to allow admin access
CREATE POLICY "Admins can view all users" 
ON public.users 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any user" 
ON public.users 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update reviews SELECT policy to exclude hidden reviews by default
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

CREATE POLICY "Anyone can view non-hidden reviews" 
ON public.reviews 
FOR SELECT 
USING (is_hidden = false);

CREATE POLICY "Admins can view all reviews including hidden" 
ON public.reviews 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));