import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { startDate, endDate } = await req.json();

    // Get all merchants
    const { data: merchants, error: merchantsError } = await supabase
      .from('merchants')
      .select('id, name, psp_fee_pct, psp_fee_fixed_cents')
      .eq('is_active', true);

    if (merchantsError) {
      throw merchantsError;
    }

    const settlements = [];

    for (const merchant of merchants) {
      // Get captured transactions for this merchant in the period
      const { data: transactions, error: transactionsError } = await supabase
        .from('pending_transactions')
        .select('final_amount')
        .eq('merchant_id', merchant.id)
        .eq('status', 'captured')
        .gte('captured_at', startDate)
        .lte('captured_at', endDate);

      if (transactionsError) {
        console.error(`Error fetching transactions for merchant ${merchant.id}:`, transactionsError);
        continue;
      }

      if (!transactions || transactions.length === 0) {
        continue; // Skip merchants with no transactions
      }

      // Calculate totals
      const grossCents = transactions.reduce((sum, t) => sum + Number(t.final_amount), 0);
      const feesCents = Math.round(
        (grossCents * (merchant.psp_fee_pct / 100)) + (transactions.length * merchant.psp_fee_fixed_cents)
      );
      const netCents = grossCents - feesCents;

      // Check if settlement already exists for this period
      const { data: existingSettlement } = await supabase
        .from('merchant_settlements')
        .select('id')
        .eq('merchant_id', merchant.id)
        .eq('period_start', startDate)
        .eq('period_end', endDate)
        .single();

      if (existingSettlement) {
        console.log(`Settlement already exists for merchant ${merchant.id} for period ${startDate} to ${endDate}`);
        continue;
      }

      // Create settlement record
      const { data: settlement, error: settlementError } = await supabase
        .from('merchant_settlements')
        .insert({
          merchant_id: merchant.id,
          period_start: startDate,
          period_end: endDate,
          gross_cents: grossCents,
          fees_cents: feesCents,
          net_cents: netCents,
          status: 'pending'
        })
        .select()
        .single();

      if (settlementError) {
        console.error(`Error creating settlement for merchant ${merchant.id}:`, settlementError);
        continue;
      }

      settlements.push(settlement);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        settlements: settlements.length,
        message: `Generated ${settlements.length} settlements`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error generating settlements:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});