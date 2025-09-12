-- Add role field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Create merchant_terminals table
CREATE TABLE IF NOT EXISTS merchant_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on merchant_terminals
ALTER TABLE merchant_terminals ENABLE ROW LEVEL SECURITY;

-- Create policies for merchant_terminals (drop first if they exist)
DROP POLICY IF EXISTS "Anyone can view active terminals" ON merchant_terminals;
DROP POLICY IF EXISTS "Merchants can manage their terminals" ON merchant_terminals;

CREATE POLICY "Anyone can view active terminals" ON merchant_terminals
  FOR SELECT USING (is_active = true);

CREATE POLICY "Merchants can manage their terminals" ON merchant_terminals
  FOR ALL USING (merchant_id IN (
    SELECT id FROM merchants WHERE owner_id = auth.uid()
  ));

-- Add fields to pending_transactions table
ALTER TABLE pending_transactions ADD COLUMN IF NOT EXISTS terminal_id uuid REFERENCES merchant_terminals(id);
ALTER TABLE pending_transactions ADD COLUMN IF NOT EXISTS lane_token text;
ALTER TABLE pending_transactions ADD COLUMN IF NOT EXISTS customer_code text;

-- Create index for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_pending_transactions_terminal_status 
  ON pending_transactions(terminal_id, status) WHERE status IN ('awaiting_customer', 'awaiting_merchant_confirm', 'pending');

-- Create index for lane token lookups
CREATE INDEX IF NOT EXISTS idx_pending_transactions_lane_token 
  ON pending_transactions(lane_token) WHERE lane_token IS NOT NULL;

-- Insert demo terminals for existing merchants
INSERT INTO merchant_terminals (merchant_id, label) 
SELECT id, 'Main Counter' FROM merchants 
WHERE NOT EXISTS (SELECT 1 FROM merchant_terminals WHERE merchant_id = merchants.id AND label = 'Main Counter');

INSERT INTO merchant_terminals (merchant_id, label) 
SELECT id, 'Stall 1' FROM merchants 
WHERE NOT EXISTS (SELECT 1 FROM merchant_terminals WHERE merchant_id = merchants.id AND label = 'Stall 1');

INSERT INTO merchant_terminals (merchant_id, label) 
SELECT id, 'Stall 2' FROM merchants 
WHERE NOT EXISTS (SELECT 1 FROM merchant_terminals WHERE merchant_id = merchants.id AND label = 'Stall 2');