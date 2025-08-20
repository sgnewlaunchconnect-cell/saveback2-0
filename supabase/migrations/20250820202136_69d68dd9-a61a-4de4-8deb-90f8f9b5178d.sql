-- Fix security warning by adding search_path parameter
CREATE OR REPLACE FUNCTION get_deal_stats(deal_id_param uuid)
RETURNS TABLE (
  total_grabbed bigint,
  total_redeemed bigint,
  grabbed_today bigint,
  redeemed_today bigint,
  remaining_stock integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total grabs for this deal (all time)
    COALESCE((SELECT COUNT(*) FROM grabs WHERE deal_id = deal_id_param), 0)::bigint as total_grabbed,
    
    -- Total redemptions for this deal 
    COALESCE(d.redemptions, 0)::bigint as total_redeemed,
    
    -- Grabs created today
    COALESCE((SELECT COUNT(*) FROM grabs 
              WHERE deal_id = deal_id_param 
              AND DATE(created_at) = CURRENT_DATE), 0)::bigint as grabbed_today,
    
    -- Redemptions today (grabs used today)
    COALESCE((SELECT COUNT(*) FROM grabs 
              WHERE deal_id = deal_id_param 
              AND DATE(used_at) = CURRENT_DATE 
              AND status = 'USED'), 0)::bigint as redeemed_today,
    
    -- Remaining stock (null if unlimited)
    CASE 
      WHEN d.stock IS NULL THEN NULL
      ELSE GREATEST(0, d.stock - COALESCE(d.redemptions, 0))
    END as remaining_stock
    
  FROM deals d
  WHERE d.id = deal_id_param;
END;
$$;