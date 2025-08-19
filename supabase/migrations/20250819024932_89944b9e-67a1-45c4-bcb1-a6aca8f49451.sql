-- Fix the ambiguous pin reference in generate_grab_pin function
CREATE OR REPLACE FUNCTION public.generate_grab_pin()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_pin TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if PIN already exists in active grabs
    SELECT EXISTS(
      SELECT 1 FROM public.grabs 
      WHERE grabs.pin = new_pin 
      AND grabs.status = 'ACTIVE' 
      AND grabs.expires_at > now()
    ) INTO exists_check;
    
    -- Exit loop if PIN is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_pin;
END;
$function$