
DO $$
BEGIN
  -- Drop existing status check if it exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'pending_transactions'
      AND constraint_name = 'pending_transactions_status_check'
  ) THEN
    ALTER TABLE public.pending_transactions
      DROP CONSTRAINT pending_transactions_status_check;
  END IF;
END
$$;

-- Recreate status check to include validated (and other sensible states)
ALTER TABLE public.pending_transactions
  ADD CONSTRAINT pending_transactions_status_check
  CHECK (status IN ('pending', 'validated', 'expired', 'cancelled', 'failed', 'completed'));
