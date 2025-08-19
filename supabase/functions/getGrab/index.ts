
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

    const { grabId, anonymousUserId } = await req.json();

    if (!grabId) {
      throw new Error('Grab ID is required');
    }

    // Get grab data
    const { data: grabData, error: grabError } = await supabaseClient
      .from('grabs')
      .select('id, pin, status, expires_at, created_at, deal_id, merchant_id, user_id, anon_user_id')
      .eq('id', grabId)
      .single();

    if (grabError) {
      console.error('Error fetching grab:', grabError);
      throw new Error('Grab not found');
    }

    // Verify ownership - either by user_id (if authenticated) or anon_user_id
    let hasAccess = false;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (user && grabData.user_id === user.id) {
          hasAccess = true;
        }
      } catch (authError) {
        // Continue to check anonymous access
      }
    }

    // Check anonymous access
    if (!hasAccess && grabData.anon_user_id === anonymousUserId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get deal data
    const { data: dealData, error: dealError } = await supabaseClient
      .from('deals')
      .select(`
        title, 
        description, 
        discount_pct, 
        cashback_pct, 
        reward_mode,
        merchants (name, address)
      `)
      .eq('id', grabData.deal_id)
      .single();

    if (dealError) {
      console.error('Error fetching deal:', dealError);
      throw new Error('Deal not found');
    }

    // Return combined data
    return new Response(JSON.stringify({
      success: true,
      data: {
        ...grabData,
        deals: dealData
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in getGrab function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
