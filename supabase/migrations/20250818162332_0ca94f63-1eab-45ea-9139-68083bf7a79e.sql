-- Remove the live_transactions table and related functions
DROP TABLE IF EXISTS public.live_transactions CASCADE;
DROP FUNCTION IF EXISTS public.calculate_transaction_totals CASCADE;