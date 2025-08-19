
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to bypass RLS for anonymous users
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { anonymousUserId } = await req.json();

    let userId = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (user) {
          userId = user.id;
        }
      } catch (authError) {
        // Continue with anonymous user
      }
    }

    // First, fetch grabs with basic info
    let grabsQuery = supabaseClient
      .from('grabs')
      .select('id, pin, status, expires_at, created_at, deal_id, merchant_id')
      .gt('expires_at', new Date().toISOString())
      .eq('status', 'ACTIVE');

    if (userId) {
      // Get grabs for authenticated user
      grabsQuery = grabsQuery.eq('user_id', userId);
    } else if (anonymousUserId) {
      // Get grabs for anonymous user
      grabsQuery = grabsQuery.eq('anon_user_id', anonymousUserId);
    } else {
      // No user ID provided
      return new Response(JSON.stringify({
        success: true,
        data: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: grabs, error: grabsError } = await grabsQuery.order('created_at', { ascending: false });

    if (grabsError) {
      console.error('Error fetching grabs:', grabsError);
      throw new Error('Failed to fetch grabs');
    }

    if (!grabs || grabs.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get unique deal IDs and merchant IDs
    const dealIds = [...new Set(grabs.map(grab => grab.deal_id))];
    const merchantIds = [...new Set(grabs.map(grab => grab.merchant_id))];

    // Fetch deals separately
    const { data: deals, error: dealsError } = await supabaseClient
      .from('deals')
      .select('id, title, description, discount_pct, cashback_pct')
      .in('id', dealIds);

    if (dealsError) {
      console.error('Error fetching deals:', dealsError);
      throw new Error('Failed to fetch deal details');
    }

    // Fetch merchants separately
    const { data: merchants, error: merchantsError } = await supabaseClient
      .from('merchants')
      .select('id, name, address')
      .in('id', merchantIds);

    if (merchantsError) {
      console.error('Error fetching merchants:', merchantsError);
      throw new Error('Failed to fetch merchant details');
    }

    // Combine the data
    const enrichedGrabs = grabs.map(grab => {
      const deal = deals?.find(d => d.id === grab.deal_id);
      const merchant = merchants?.find(m => m.id === grab.merchant_id);
      
      return {
        id: grab.id,
        pin: grab.pin,
        status: grab.status,
        expires_at: grab.expires_at,
        created_at: grab.created_at,
        deals: {
          id: deal?.id || '',
          title: deal?.title || 'Unknown Deal',
          description: deal?.description || '',
          discount_pct: deal?.discount_pct || 0,
          cashback_pct: deal?.cashback_pct || 0,
          merchants: {
            name: merchant?.name || 'Unknown Merchant',
            address: merchant?.address || ''
          }
        }
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: enrichedGrabs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in getGrabs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
