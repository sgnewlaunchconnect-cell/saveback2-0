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
    const { pending_id, customer_code } = await req.json();

    if (!pending_id || !customer_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pending_id, customer_code' }),
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
      .eq('status', 'awaiting_merchant_confirm')
      .single();

    if (pendingError || !pending) {
      return new Response(
        JSON.stringify({ error: 'Pending transaction not found or not awaiting confirmation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify customer code
    if (pending.customer_code !== customer_code) {
      return new Response(
        JSON.stringify({ error: 'Invalid customer code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate final amounts
    const creditsUsed = (pending.customer_selected_local_credits + pending.customer_selected_network_credits) / 100;
    const netPayable = pending.original_amount - creditsUsed;

    // Update transaction to completed
    const { data: completed, error: updateError } = await supabase
      .from('pending_transactions')
      .update({
        status: 'completed',
        captured_at: new Date().toISOString()
      })
      .eq('id', pending_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error completing transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // In a real app, you would also:
    // 1. Deduct credits from user's wallet
    // 2. Create a transaction record
    // 3. Update merchant analytics

    console.log('Completed transaction:', completed);

    return new Response(
      JSON.stringify({
        transaction_id: completed.id,
        original_amount: completed.original_amount,
        credits_used: creditsUsed,
        net_payable: netPayable,
        status: 'completed'
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