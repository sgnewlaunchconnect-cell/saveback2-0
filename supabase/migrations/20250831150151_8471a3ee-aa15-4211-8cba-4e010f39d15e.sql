-- Allow pending transactions to be created without an amount (for merchant-keyed flow)
ALTER TABLE public.pending_transactions
  ALTER COLUMN original_amount DROP NOT NULL,
  ALTER COLUMN final_amount DROP NOT NULL;

-- Track who enters the amount (customer or merchant)  
ALTER TABLE public.pending_transactions
  ADD COLUMN IF NOT EXISTS amount_entry_mode text NOT NULL DEFAULT 'customer';

-- Restrict values for amount_entry_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint  
    WHERE conname = 'pending_transactions_amount_entry_mode_check'
  ) THEN
    ALTER TABLE public.pending_transactions
      ADD CONSTRAINT pending_transactions_amount_entry_mode_check
      CHECK (amount_entry_mode IN ('customer','merchant'));
  END IF;
END
$$;