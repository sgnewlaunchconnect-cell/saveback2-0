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
    const { merchantId, originalAmount, grabId, dealId, anonymousUserId, isDemoMode, localCreditsUsed = 0, networkCreditsUsed = 0 } = await req.json();

    console.log('createPendingTransaction called with:', {
      merchantId,
      originalAmount,
      grabId,
      dealId,
      anonymousUserId,
      isDemoMode
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

    // Determine user_id - use demo user for anonymous/demo users
    const userId = (anonymousUserId || isDemoMode) ? '550e8400-e29b-41d4-a716-446655440000' : null;

    // Get merchant info to calculate cashback
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('default_cashback_pct, name')
      .eq('id', merchantId)
      .maybeSingle();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching merchant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!merchant) {
      console.error('Merchant not found:', merchantId);
      return new Response(
        JSON.stringify({ error: 'Merchant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get deal info if grabId or dealId provided, and check for existing grab
    let cashbackPct = merchant.default_cashback_pct || 5; // Default 5% if merchant has no default
    let dealInfo = null;
    let linkedGrabId = grabId;

    if (grabId) {
      const { data: grab, error: grabError } = await supabase
        .from('grabs')
        .select(`
          id,
          status,
          deals (
            id,
            title,
            cashback_pct,
            discount_pct
          )
        `)
        .eq('id', grabId)
        .maybeSingle();

      if (!grabError && grab?.deals) {
        dealInfo = grab.deals;
        cashbackPct = grab.deals.cashback_pct || cashbackPct;
        // Only link if grab is still ACTIVE
        linkedGrabId = grab.status === 'ACTIVE' ? grab.id : null;
      }
    } else if (dealId) {
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id, title, cashback_pct, discount_pct')
        .eq('id', dealId)
        .maybeSingle();

      if (!dealError && deal) {
        dealInfo = deal;
        cashbackPct = deal.cashback_pct || cashbackPct;
        
        // Check if user has an existing ACTIVE grab for this deal
        if (userId) {
          const { data: existingGrab } = await supabase
            .from('grabs')
            .select('id')
            .eq('user_id', userId)
            .eq('deal_id', dealId)
            .eq('status', 'ACTIVE')
            .maybeSingle();
          
          linkedGrabId = existingGrab?.id || null;
        }
      }
    }

    // Calculate final amount after credit deductions
    const totalCreditsUsed = localCreditsUsed + networkCreditsUsed;
    const finalAmount = Math.max(0, originalAmount - totalCreditsUsed);

    // Generate dummy 6-digit PIN code
    const dummyPin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create pending transaction with dummy PIN and 3-minute expiration
    const { data: transaction, error: transactionError } = await supabase
      .from('pending_transactions')
      .insert({
        user_id: userId,
        merchant_id: merchantId,
        original_amount: originalAmount,
        final_amount: finalAmount,
        local_credits_used: localCreditsUsed,
        network_credits_used: networkCreditsUsed,
        deal_id: dealId || (dealInfo?.id),
        grab_id: linkedGrabId,
        status: 'pending',
        payment_code: dummyPin,
        expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3 minutes from now
      })
      .select('id, payment_code, expires_at')
      .maybeSingle();

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