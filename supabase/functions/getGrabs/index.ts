
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

    // Build query for grabs
    let grabsQuery = supabaseClient
      .from('grabs')
      .select(`
        id,
        pin,
        status,
        expires_at,
        created_at,
        deals (
          id,
          title,
          description,
          discount_pct,
          cashback_pct,
          merchants (name, address)
        )
      `)
      .gt('expires_at', new Date().toISOString())
      .in('status', ['ACTIVE', 'LOCKED']);

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

    const { data: grabs, error } = await grabsQuery.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching grabs:', error);
      throw new Error('Failed to fetch grabs');
    }

    return new Response(JSON.stringify({
      success: true,
      data: grabs || []
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
