-- Enable real-time updates for the grabs table
ALTER TABLE public.grabs REPLICA IDENTITY FULL;

-- Add the grabs table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.grabs;