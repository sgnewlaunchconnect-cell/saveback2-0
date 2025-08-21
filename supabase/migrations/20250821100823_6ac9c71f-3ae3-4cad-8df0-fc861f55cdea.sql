-- Add new columns to pending_transactions for two-step collection process
ALTER TABLE pending_transactions 
ADD COLUMN authorized_at timestamp with time zone,
ADD COLUMN captured_at timestamp with time zone,
ADD COLUMN voided_at timestamp with time zone;

-- Update status enum to support new states
-- Note: We'll keep the existing 'pending' and 'validated' states for backward compatibility
-- and add logic to handle the new workflow in the application layer

-- Add index for efficient querying of authorized transactions
CREATE INDEX idx_pending_transactions_status_authorized ON pending_transactions(status, authorized_at) 
WHERE status IN ('pending', 'authorized', 'completed');