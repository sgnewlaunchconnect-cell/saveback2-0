
-- 1) Allow anonymous users by adding anon_user_id and making user_id nullable
ALTER TABLE public.grabs
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.grabs
  ADD COLUMN IF NOT EXISTS anon_user_id TEXT;

-- 2) Index for fast anonymous lookups
CREATE INDEX IF NOT EXISTS idx_grabs_anon_user_id ON public.grabs(anon_user_id);

-- Note:
-- Existing RLS policies remain. We will rely on the Edge Function using the service role
-- for inserts and reads in the anonymous flow, so we don't need to broaden public SELECT here.
