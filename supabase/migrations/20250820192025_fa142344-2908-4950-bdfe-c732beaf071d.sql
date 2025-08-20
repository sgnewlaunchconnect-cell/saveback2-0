-- Add allow_pin_fallback setting to merchants table
ALTER TABLE merchants ADD COLUMN allow_pin_fallback boolean DEFAULT false;

-- Add grab_id to pending_transactions to link reservations to payments
ALTER TABLE pending_transactions ADD COLUMN grab_id uuid REFERENCES grabs(id);

-- Enable realtime for merchant notifications and pending transactions
ALTER TABLE merchant_notifications REPLICA IDENTITY FULL;
ALTER TABLE pending_transactions REPLICA IDENTITY FULL;

-- Add these tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE merchant_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_transactions;