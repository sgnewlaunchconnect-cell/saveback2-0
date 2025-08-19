import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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
    const { merchantId, originalAmount, grabId, dealId, anonymousUserId } = await req.json();

    console.log('createPendingTransaction called with:', {
      merchantId,
      originalAmount,
      grabId,
      dealId,
      anonymousUserId
    });

    // Validate required fields
    if (!merchantId || !originalAmount) {
      return new Response(
        JSON.stringify({ error: 'merchantId and originalAmount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine user_id - use demo user for anonymous users
    const userId = anonymousUserId ? '550e8400-e29b-41d4-a716-446655440000' : null;

    // Get merchant info to calculate cashback
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('default_cashback_pct, name')
      .eq('id', merchantId)
      .single();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
      return new Response(
        JSON.stringify({ error: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get deal info if grabId or dealId provided
    let cashbackPct = merchant.default_cashback_pct || 5; // Default 5% if merchant has no default
    let dealInfo = null;

    if (grabId) {
      const { data: grab, error: grabError } = await supabase
        .from('grabs')
        .select(`
          deals (
            id,
            title,
            cashback_pct,
            discount_pct
          )
        `)
        .eq('id', grabId)
        .single();

      if (!grabError && grab?.deals) {
        dealInfo = grab.deals;
        cashbackPct = grab.deals.cashback_pct || cashbackPct;
      }
    } else if (dealId) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id, title, cashback_pct, discount_pct')
        .eq('id', dealId)
        .single();

      if (!dealError && deal) {
        dealInfo = deal;
        cashbackPct = deal.cashback_pct || cashbackPct;
      }
    }

    // Calculate final amount (for manual hawkers, it's the same as original since they pay externally)
    const finalAmount = originalAmount;

    // Create pending transaction - the set_payment_code trigger will generate the 6-digit code
    const { data: transaction, error: transactionError } = await supabase
      .from('pending_transactions')
      .insert({
        user_id: userId,
        merchant_id: merchantId,
        original_amount: originalAmount,
        final_amount: finalAmount,
        deal_id: dealId || (dealInfo?.id),
        status: 'pending',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      })
      .select('id, payment_code, expires_at')
      .single();

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created pending transaction:', transaction);

    // Return transaction details
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transactionId: transaction.id,
          paymentCode: transaction.payment_code,
          expiresAt: transaction.expires_at,
          merchantName: merchant.name,
          originalAmount,
          finalAmount,
          cashbackPct,
          dealInfo
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in createPendingTransaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});