-- Fix function search path security issues by setting search_path for existing functions
ALTER FUNCTION public.calculate_tier_level(integer) SET search_path = 'public';
ALTER FUNCTION public.award_tier_points(uuid, uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.process_credit_payment(uuid, uuid, integer, integer, integer, integer) SET search_path = 'public';
ALTER FUNCTION public.get_user_role(uuid) SET search_path = 'public';
ALTER FUNCTION public.increment_group_buy_quantity(uuid, integer) SET search_path = 'public';
ALTER FUNCTION public.generate_grab_pin() SET search_path = 'public';
ALTER FUNCTION public.set_grab_pin() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = 'public';
ALTER FUNCTION public.generate_payment_code() SET search_path = 'public';
ALTER FUNCTION public.set_payment_code() SET search_path = 'public';