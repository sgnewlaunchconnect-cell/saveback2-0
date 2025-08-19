
-- Seed a demo hawker merchant and three active deals (idempotent)

WITH existing_merchant AS (
  SELECT id FROM public.merchants WHERE name = 'Hawker Corner' LIMIT 1
),
created_merchant AS (
  INSERT INTO public.merchants (
    name, category, address, is_active,
    default_reward_mode, default_cashback_pct, default_discount_pct,
    logo_url
  )
  SELECT
    'Hawker Corner',
    'restaurant',
    'Maxwell Food Centre, Stall #12',
    true,
    'CASHBACK',
    8,              -- default cashback %
    0,              -- default discount %
    'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=200&h=200&fit=crop'
  WHERE NOT EXISTS (SELECT 1 FROM existing_merchant)
  RETURNING id
),
m AS (
  SELECT id FROM created_merchant
  UNION ALL
  SELECT id FROM existing_merchant
),

-- Deal 1: Direct Discount
ins_deal_1 AS (
  INSERT INTO public.deals (
    title, description, discount_pct, cashback_pct, reward_mode,
    end_at, is_active, merchant_id
  )
  SELECT
    'Hawker Lunch Special',
    '20% off any rice or noodle set between 11am - 2pm',
    20, 0, 'DISCOUNT',
    now() + interval '14 days',
    true, m.id
  FROM m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.title = 'Hawker Lunch Special' AND d.merchant_id = m.id
  )
  RETURNING id
),

-- Deal 2: Credit Rewards
ins_deal_2 AS (
  INSERT INTO public.deals (
    title, description, discount_pct, cashback_pct, reward_mode,
    end_at, is_active, merchant_id
  )
  SELECT
    'Hawker Cashback Treat',
    'Earn 10% credits back on all purchases',
    0, 10, 'CASHBACK',
    now() + interval '14 days',
    true, m.id
  FROM m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.title = 'Hawker Cashback Treat' AND d.merchant_id = m.id
  )
  RETURNING id
),

-- Deal 3: Both Discount + Cashback
ins_deal_3 AS (
  INSERT INTO public.deals (
    title, description, discount_pct, cashback_pct, reward_mode,
    end_at, is_active, merchant_id
  )
  SELECT
    'Hawker Combo Deal',
    'Get 10% off now and 10% credits back on your next visit',
    10, 10, 'BOTH',
    now() + interval '14 days',
    true, m.id
  FROM m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.title = 'Hawker Combo Deal' AND d.merchant_id = m.id
  )
  RETURNING id
)

SELECT 'seed_complete' AS status;
