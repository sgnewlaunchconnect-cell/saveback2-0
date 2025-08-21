
-- Ensure the foreign keys and helpful indexes exist for pending_transactions
DO $$
BEGIN
  -- FK: pending_transactions.merchant_id -> merchants.id
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'pending_transactions_merchant_id_fkey'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'pending_transactions'
  ) THEN
    ALTER TABLE public.pending_transactions
      ADD CONSTRAINT pending_transactions_merchant_id_fkey
      FOREIGN KEY (merchant_id)
      REFERENCES public.merchants (id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;

  -- FK: pending_transactions.deal_id -> deals.id
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'pending_transactions_deal_id_fkey'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'pending_transactions'
  ) THEN
    ALTER TABLE public.pending_transactions
      ADD CONSTRAINT pending_transactions_deal_id_fkey
      FOREIGN KEY (deal_id)
      REFERENCES public.deals (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;

  -- FK: pending_transactions.grab_id -> grabs.id
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'pending_transactions_grab_id_fkey'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'pending_transactions'
  ) THEN
    ALTER TABLE public.pending_transactions
      ADD CONSTRAINT pending_transactions_grab_id_fkey
      FOREIGN KEY (grab_id)
      REFERENCES public.grabs (id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END
$$;

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_pending_transactions_payment_code
  ON public.pending_transactions (payment_code);

CREATE INDEX IF NOT EXISTS idx_pending_transactions_status
  ON public.pending_transactions (status);
