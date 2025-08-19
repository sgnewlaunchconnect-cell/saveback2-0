-- Update the set_grab_pin trigger function to avoid ambiguity
CREATE OR REPLACE FUNCTION public.set_grab_pin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.pin IS NULL OR NEW.pin = '' THEN
    NEW.pin := public.generate_grab_pin();
  END IF;
  RETURN NEW;
END;
$function$