import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { terminal_id, lane_token } = await req.json();

    if (!terminal_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: terminal_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabase
      .from('pending_transactions')
      .select('*')
      .eq('terminal_id', terminal_id)
      .eq('status', 'awaiting_customer')
      .gt('expires_at', new Date().toISOString());

    // If lane_token provided, match it; otherwise get the single pending one
    if (lane_token) {
      query = query.eq('lane_token', lane_token);
    } else {
      // For auto-match, ensure there's only one pending
      const { data: count, error: countError } = await supabase
        .from('pending_transactions')
        .select('id')
        .eq('terminal_id', terminal_id)
        .eq('status', 'awaiting_customer')
        .gt('expires_at', new Date().toISOString());

      if (countError || !count || count.length !== 1) {
        return new Response(
          JSON.stringify({ error: 'Token required - multiple pending transactions' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: pending, error } = await query.single();

    if (error || !pending) {
      return new Response(
        JSON.stringify({ error: 'Pending transaction not found or expired' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found pending transaction:', pending);

    return new Response(
      JSON.stringify({
        pending_id: pending.id,
        amount: pending.original_amount,
        expires_at: pending.expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});