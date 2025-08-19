-- Create the trigger for auto-generating PINs on grabs table
CREATE TRIGGER set_grab_pin_trigger
  BEFORE INSERT ON public.grabs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_grab_pin();