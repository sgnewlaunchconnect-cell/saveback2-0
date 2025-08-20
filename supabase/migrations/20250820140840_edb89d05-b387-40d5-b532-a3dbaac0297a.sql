-- Add PSP capabilities and fee configuration to merchants table
ALTER TABLE public.merchants 
ADD COLUMN psp_enabled boolean DEFAULT false,
ADD COLUMN psp_provider text DEFAULT 'stripe',
ADD COLUMN psp_fee_mode text DEFAULT 'pass', -- 'pass', 'absorb', 'split'
ADD COLUMN psp_fee_pct numeric DEFAULT 2.9,
ADD COLUMN psp_fee_fixed_cents integer DEFAULT 30,
ADD COLUMN stripe_account_id text;