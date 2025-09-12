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
    const { pending_id, requested_credits } = await req.json();

    if (!pending_id || requested_credits === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pending_id, requested_credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get pending transaction
    const { data: pending, error: pendingError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('id', pending_id)
      .eq('status', 'awaiting_customer')
      .single();

    if (pendingError || !pending) {
      return new Response(
        JSON.stringify({ error: 'Pending transaction not found or not in correct status' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get demo user credits (using fixed demo user ID)
    const demoUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    // For demo, we'll simulate credits - in real app, fetch from credits table
    const demoLocalCredits = 12.00;
    const demoNetworkCredits = 6.00;
    const totalAvailableCredits = demoLocalCredits + demoNetworkCredits;

    // Apply 50% cap
    const maxCredits = pending.original_amount * 0.5;
    const actualCredits = Math.min(requested_credits, maxCredits, totalAvailableCredits);

    // Generate 6-digit customer code
    const customer_code = Math.floor(100000 + Math.random() * 900000).toString();

    // Update pending transaction
    const { data: updated, error: updateError } = await supabase
      .from('pending_transactions')
      .update({
        customer_selected_local_credits: Math.min(actualCredits, demoLocalCredits) * 100, // Convert to cents
        customer_selected_network_credits: Math.max(0, actualCredits - demoLocalCredits) * 100,
        customer_code,
        status: 'awaiting_merchant_confirm',
        final_amount: pending.original_amount - actualCredits
      })
      .eq('id', pending_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating pending transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to apply credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Applied credits to pending transaction:', updated);

    return new Response(
      JSON.stringify({
        pending_id,
        amount: pending.original_amount,
        credits_applied: actualCredits,
        customer_code,
        net_payable: pending.original_amount - actualCredits,
        demo_credits_remaining: {
          local: demoLocalCredits - Math.min(actualCredits, demoLocalCredits),
          network: demoNetworkCredits - Math.max(0, actualCredits - demoLocalCredits)
        }
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