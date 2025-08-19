-- Add tier system to users table
ALTER TABLE public.users 
ADD COLUMN tier_level text DEFAULT 'Bronze' CHECK (tier_level IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
ADD COLUMN tier_points integer DEFAULT 0,
ADD COLUMN tier_points_lifetime integer DEFAULT 0,
ADD COLUMN tier_updated_at timestamp with time zone DEFAULT now();

-- Create tier_events table to track point history
CREATE TABLE public.tier_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  grab_id uuid REFERENCES public.grabs(id),
  event_type text NOT NULL DEFAULT 'GRAB_USED' CHECK (event_type IN ('GRAB_USED', 'NEW_MERCHANT_BONUS', 'TIER_UPGRADE')),
  points_earned integer NOT NULL DEFAULT 0,
  new_tier_level text,
  merchant_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on tier_events
ALTER TABLE public.tier_events ENABLE ROW LEVEL SECURITY;

-- Create policies for tier_events
CREATE POLICY "Users can view their own tier events" 
ON public.tier_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert tier events" 
ON public.tier_events 
FOR INSERT 
WITH CHECK (true);

-- Create function to calculate tier level based on points
CREATE OR REPLACE FUNCTION public.calculate_tier_level(points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF points >= 100 THEN
    RETURN 'Platinum';
  ELSIF points >= 50 THEN
    RETURN 'Gold';
  ELSIF points >= 20 THEN
    RETURN 'Silver';
  ELSE
    RETURN 'Bronze';
  END IF;
END;
$$;

-- Create function to award tier points
CREATE OR REPLACE FUNCTION public.award_tier_points(
  p_user_id uuid,
  p_grab_id uuid,
  p_merchant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_points_to_award integer := 1;
  v_is_new_merchant boolean := false;
  v_current_points integer;
  v_new_total_points integer;
  v_old_tier text;
  v_new_tier text;
BEGIN
  -- Get current user tier info
  SELECT tier_points, tier_level 
  INTO v_current_points, v_old_tier
  FROM users 
  WHERE user_id = p_user_id;

  -- Check if this is a new merchant for the user
  SELECT NOT EXISTS(
    SELECT 1 FROM tier_events 
    WHERE user_id = p_user_id 
    AND merchant_id = p_merchant_id 
    AND event_type = 'GRAB_USED'
  ) INTO v_is_new_merchant;

  -- Award bonus point for new merchant
  IF v_is_new_merchant THEN
    v_points_to_award := v_points_to_award + 1;
  END IF;

  -- Calculate new points total (rolling 90-day window)
  -- For now, we'll use lifetime points but can implement rolling window later
  v_new_total_points := v_current_points + v_points_to_award;
  
  -- Calculate new tier
  v_new_tier := calculate_tier_level(v_new_total_points);

  -- Update user points and tier
  UPDATE users 
  SET 
    tier_points = v_new_total_points,
    tier_points_lifetime = tier_points_lifetime + v_points_to_award,
    tier_level = v_new_tier,
    tier_updated_at = now()
  WHERE user_id = p_user_id;

  -- Record grab usage event
  INSERT INTO tier_events (user_id, grab_id, event_type, points_earned, merchant_id)
  VALUES (p_user_id, p_grab_id, 'GRAB_USED', 1, p_merchant_id);

  -- Record new merchant bonus if applicable
  IF v_is_new_merchant THEN
    INSERT INTO tier_events (user_id, grab_id, event_type, points_earned, merchant_id)
    VALUES (p_user_id, p_grab_id, 'NEW_MERCHANT_BONUS', 1, p_merchant_id);
  END IF;

  -- Record tier upgrade if tier changed
  IF v_old_tier != v_new_tier THEN
    INSERT INTO tier_events (user_id, event_type, points_earned, new_tier_level)
    VALUES (p_user_id, 'TIER_UPGRADE', 0, v_new_tier);
  END IF;
END;
$$;