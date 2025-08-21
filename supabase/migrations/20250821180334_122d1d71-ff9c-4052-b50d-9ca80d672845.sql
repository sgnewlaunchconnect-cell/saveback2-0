
-- 1) Create review_replies table to allow merchants to respond to reviews
create table if not exists public.review_replies (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  merchant_id uuid not null,
  responder_id uuid, -- optional: merchant owner who replied
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Enable RLS
alter table public.review_replies enable row level security;

-- 3) RLS policies
-- Anyone can view replies
create policy if not exists "Anyone can view review replies"
  on public.review_replies
  for select
  using (true);

-- Merchants can manage replies for their own merchant
create policy if not exists "Merchants can manage their own review replies - insert"
  on public.review_replies
  for insert
  with check (
    merchant_id in (
      select m.id from public.merchants m
      where m.owner_id = auth.uid()
    )
  );

create policy if not exists "Merchants can manage their own review replies - update"
  on public.review_replies
  for update
  using (
    merchant_id in (
      select m.id from public.merchants m
      where m.owner_id = auth.uid()
    )
  );

create policy if not exists "Merchants can manage their own review replies - delete"
  on public.review_replies
  for delete
  using (
    merchant_id in (
      select m.id from public.merchants m
      where m.owner_id = auth.uid()
    )
  );

-- 4) Keep updated_at current
drop trigger if exists set_review_replies_updated_at on public.review_replies;
create trigger set_review_replies_updated_at
before update on public.review_replies
for each row
execute function public.update_updated_at_column();

-- 5) Helpful indexes
-- Reviews: by merchant and time, and by user+merchant (for "one review per user" logic in code)
create index if not exists idx_reviews_merchant_created_at
  on public.reviews (merchant_id, created_at desc);

create index if not exists idx_reviews_user_merchant
  on public.reviews (user_id, merchant_id);

-- Replies: ensure one reply per review and speed up lookups
create unique index if not exists idx_review_replies_unique_review
  on public.review_replies (review_id);

create index if not exists idx_review_replies_review_id
  on public.review_replies (review_id);
