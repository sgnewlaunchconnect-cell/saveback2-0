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
    const { merchant_id, terminal_id } = await req.json();

    if (!merchant_id || !terminal_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: merchant_id, terminal_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle demo merchant ID
    let actualMerchantId = merchant_id;
    if (merchant_id === 'demo-merchant') {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('id')
        .limit(1)
        .single();
      if (merchant) actualMerchantId = merchant.id;
    }

    // Find pending transactions at this terminal
    const { data: pending, error } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('terminal_id', terminal_id)
      .eq('status', 'awaiting_customer')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error finding pending transactions:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to find pending transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending transactions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If exactly one pending transaction, auto-match
    if (pending.length === 1) {
      return new Response(
        JSON.stringify({
          auto_match: true,
          pending_id: pending[0].id,
          amount: pending[0].original_amount,
          expires_at: pending[0].expires_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Multiple pending transactions - require token
    return new Response(
      JSON.stringify({
        needs_token: true,
        count: pending.length,
        tokens: pending.map(p => ({
          token: p.lane_token,
          amount: p.original_amount
        }))
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