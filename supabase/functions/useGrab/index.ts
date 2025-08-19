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

    const { grabId, anonymousUserId, paymentCode } = await req.json();

    console.log('useGrab called with:', { grabId, anonymousUserId, paymentCode });

    if (!grabId || !paymentCode) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters'
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

    // Verify the grab exists and belongs to the user
    let grabQuery = supabaseClient
      .from('grabs')
      .select('*')
      .eq('id', grabId)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString());

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

    const { data: grab, error: grabError } = await grabQuery.single();

    if (grabError || !grab) {
      console.error('Grab not found or error:', grabError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Grab pass not found or already used'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update grab status to USED
    const { error: updateError } = await supabaseClient
      .from('grabs')
      .update({ 
        status: 'USED',
        used_at: new Date().toISOString()
      })
      .eq('id', grabId);

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

    console.log('Successfully marked grab as used:', grabId);

    return new Response(JSON.stringify({
      success: true,
      data: {
        grabId: grab.id,
        status: 'USED',
        usedAt: new Date().toISOString(),
        paymentCode
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