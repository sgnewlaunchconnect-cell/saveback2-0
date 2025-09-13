-- Fix pending_transactions status constraint to support Flow 3 statuses
-- Drop the old constraint that doesn't include new Flow 3 statuses
ALTER TABLE public.pending_transactions DROP CONSTRAINT IF EXISTS pending_transactions_status_check;

-- Recreate constraint with all required statuses including Flow 3 ones
ALTER TABLE public.pending_transactions
  ADD CONSTRAINT pending_transactions_status_check
  CHECK (status IN ('awaiting_customer','awaiting_merchant_confirm','completed','expired','cancelled','failed','pending','validated'));

-- Set default status to awaiting_customer for Flow 3
ALTER TABLE public.pending_transactions ALTER COLUMN status SET DEFAULT 'awaiting_customer';

-- Update any existing pending records to use the new starting status for consistency
UPDATE public.pending_transactions 
SET status = 'awaiting_customer' 
WHERE status = 'pending' AND created_at > (NOW() - INTERVAL '1 hour');