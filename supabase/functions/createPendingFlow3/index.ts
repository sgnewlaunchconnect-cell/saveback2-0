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
    const { merchant_id, terminal_id, amount } = await req.json();

    if (!merchant_id || !terminal_id || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: merchant_id, terminal_id, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check how many pending transactions exist at this terminal
    const { data: existingPending, error: countError } = await supabase
      .from('pending_transactions')
      .select('id')
      .eq('terminal_id', terminal_id)
      .in('status', ['awaiting_customer', 'awaiting_merchant_confirm']);

    if (countError) {
      console.error('Error checking pending transactions:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to check pending transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate lane token if there are already pending transactions
    let lane_token = null;
    if (existingPending && existingPending.length > 0) {
      // Generate 3-4 character token using A-Z, 2-9 (avoiding confusing characters)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      lane_token = '';
      for (let i = 0; i < 4; i++) {
        lane_token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    // Create pending transaction
    const { data: pending, error: createError } = await supabase
      .from('pending_transactions')
      .insert({
        merchant_id,
        terminal_id,
        user_id: '550e8400-e29b-41d4-a716-446655440000', // Demo user ID
        original_amount: amount,
        final_amount: amount,
        status: 'awaiting_customer',
        lane_token,
        expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating pending transaction:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create pending transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created pending transaction:', pending);

    return new Response(
      JSON.stringify({
        pending_id: pending.id,
        amount: pending.original_amount,
        lane_token: pending.lane_token,
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