-- Enable PSP for Coffee Corner to test PSP functionality
UPDATE public.merchants 
SET psp_enabled = true
WHERE id = '550e8400-e29b-41d4-a716-446655440002';