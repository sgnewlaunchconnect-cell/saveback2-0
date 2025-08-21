
-- 1) Add missing foreign key relationships so embedded selects work in edge functions

ALTER TABLE public.pending_transactions
  ADD CONSTRAINT pending_transactions_merchant_id_fkey
    FOREIGN KEY (merchant_id)
    REFERENCES public.merchants (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

ALTER TABLE public.pending_transactions
  ADD CONSTRAINT pending_transactions_deal_id_fkey
    FOREIGN KEY (deal_id)
    REFERENCES public.deals (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

ALTER TABLE public.pending_transactions
  ADD CONSTRAINT pending_transactions_grab_id_fkey
    FOREIGN KEY (grab_id)
    REFERENCES public.grabs (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- 2) Helpful indexes for fast lookups during validation

CREATE INDEX IF NOT EXISTS idx_pending_transactions_payment_code
  ON public.pending_transactions (payment_code);

CREATE INDEX IF NOT EXISTS idx_pending_transactions_status
  ON public.pending_transactions (status);
