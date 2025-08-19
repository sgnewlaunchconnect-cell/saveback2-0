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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { grabId, anonymousUserId, paymentCode, pin } = await req.json();

    console.log('useGrab called with:', { grabId, anonymousUserId, paymentCode, pin });

    // Support both grabId-based redemption and PIN-based redemption
    if (!grabId && !pin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing grabId or PIN'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        console.log('Auth failed, continuing with anonymous user');
      }
    }

    // First try exact match with status and expiry filters
    let grabQuery = supabaseClient
      .from('grabs')
      .select('*')
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString());

    // Query by PIN or grabId
    if (pin) {
      grabQuery = grabQuery.eq('pin', pin);
    } else {
      grabQuery = grabQuery.eq('id', grabId);
      
      // Add user identification for grabId-based queries
      if (userId) {
        grabQuery = grabQuery.eq('user_id', userId);
      } else if (anonymousUserId) {
        grabQuery = grabQuery.eq('anon_user_id', anonymousUserId);
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'No user identification provided'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let { data: grab, error: grabError } = await grabQuery.single();

    // If not found with ACTIVE status, try finding any grab with this ID to check its status
    if (grabError || !grab) {
      console.log('Active grab not found, checking grab status:', grabError);
      
      const { data: anyGrab, error: anyGrabError } = await supabaseClient
        .from('grabs')
        .select('*')
        .eq('id', grabId)
        .single();

      if (anyGrabError || !anyGrab) {
        console.error('Grab not found at all:', anyGrabError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Grab pass not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if grab is already used
      if (anyGrab.status === 'USED') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Grab pass already used',
          code: 'ALREADY_USED'
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if grab is expired
      if (new Date(anyGrab.expires_at) <= new Date()) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Grab pass expired',
          code: 'EXPIRED'
        }), {
          status: 410,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If we get here, the grab exists but didn't match our filters (probably user mismatch)
      return new Response(JSON.stringify({
        success: false,
        error: 'Grab pass not found or access denied'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch deal and merchant info separately
    const { data: dealData, error: dealError } = await supabaseClient
      .from('deals')
      .select(`
        title,
        discount_pct,
        cashback_pct,
        merchants (
          name
        )
      `)
      .eq('id', grab.deal_id)
      .single();

    if (dealError) {
      console.error('Deal not found:', dealError);
      // Continue without deal info rather than failing
    }

    // Update grab status to USED
    const { error: updateError } = await supabaseClient
      .from('grabs')
      .update({ 
        status: 'USED',
        used_at: new Date().toISOString()
      })
      .eq('id', grab.id);

    if (updateError) {
      console.error('Error updating grab status:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to mark grab as used'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully marked grab as used:', grab.id);

    // Award tier points if the grab has an associated user_id
    if (grab.user_id && grab.user_id !== '550e8400-e29b-41d4-a716-446655440000') {
      try {
        const { error: tierError } = await supabaseClient.rpc('award_tier_points', {
          p_user_id: grab.user_id,
          p_grab_id: grab.id,
          p_merchant_id: grab.merchant_id
        });

        if (tierError) {
          console.error('Error awarding tier points:', tierError);
          // Don't fail the entire operation for tier point errors
        } else {
          console.log('Successfully awarded tier points for grab:', grab.id);
        }
      } catch (tierError) {
        console.error('Exception awarding tier points:', tierError);
        // Don't fail the entire operation for tier point errors
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        grabId: grab.id,
        status: 'USED',
        usedAt: new Date().toISOString(),
        paymentCode,
        dealTitle: dealData?.title,
        discountPct: dealData?.discount_pct,
        merchantName: dealData?.merchants?.name
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in useGrab function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});