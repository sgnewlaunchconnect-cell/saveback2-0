-- Seed Coffee Corner and Hawker Corner as stripe merchants for in-app payment demos
UPDATE merchants 
SET payout_method = 'stripe'
WHERE name IN ('Coffee Corner', 'Hawker Corner');

-- Add credit tracking columns to pending_transactions
ALTER TABLE pending_transactions 
ADD COLUMN local_credits_used integer DEFAULT 0,
ADD COLUMN network_credits_used integer DEFAULT 0;