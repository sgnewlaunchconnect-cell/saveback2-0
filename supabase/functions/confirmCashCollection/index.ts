import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('confirmCashCollection called with method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentCode, merchantId } = await req.json();
    
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check authentication and merchant access
    const authHeader = req.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader && merchantId) {
      try {
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(jwt);
        
        if (user) {
          currentUserId = user.id;
          
          // Check if user has access to this merchant
          const { data: hasAccess } = await supabase
            .rpc('has_merchant_access', {
              p_user_id: user.id,
              p_merchant_id: merchantId
            });
          
          if (!hasAccess) {
            return new Response(
              JSON.stringify({ error: 'Access denied to this merchant' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (authError) {
        console.error('Authentication error:', authError);
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    console.log('confirmCashCollection called with:', { paymentCode, merchantId });

    // Check if this is demo mode
    const isDemoMode = merchantId === null;
    console.log('Demo mode:', isDemoMode);

    if (!paymentCode) {
      return new Response(
        JSON.stringify({ error: 'Payment code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isDemoMode && !merchantId) {
      return new Response(
        JSON.stringify({ error: 'Merchant ID is required for non-demo transactions' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Get the validated transaction
    let query = supabase
      .from('pending_transactions')
      .select('*')
      .eq('payment_code', paymentCode)
      .eq('status', 'validated'); // Changed from 'authorized' to 'validated'

    // Only add merchant filter if not in demo mode
    if (!isDemoMode) {
      query = query.eq('merchant_id', merchantId);
    }

    const { data: transaction, error: fetchError } = await query.single();

    if (fetchError || !transaction) {
      console.error('Transaction not found or not validated:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Transaction not found or not in validated state',
          success: false 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if transaction has expired
    if (new Date(transaction.expires_at) < new Date()) {
      console.log('Transaction expired');
      
      // Mark as expired
      await supabase
        .from('pending_transactions')
        .update({ status: 'expired' })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({ 
          error: 'Transaction has expired',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark transaction as completed
    const { error: updateError } = await supabase
      .from('pending_transactions')
      .update({
        status: 'completed',
        captured_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to complete transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply credits and update user totals (same logic as validatePendingTransaction)
    const { local_credits_used, network_credits_used, user_id, grab_id } = transaction;

    // Get merchant for cashback calculation
    const { data: merchant } = await supabase
      .from('merchants')
      .select('default_cashback_pct')
      .eq('id', merchantId)
      .single();

    let dealData = null;
    let cashbackPct = merchant?.default_cashback_pct || 5;

    // Get deal data if grab_id exists
    if (grab_id) {
      const { data: grab } = await supabase
        .from('grabs')
        .select(`
          *,
          deals:deal_id (
            id,
            title,
            cashback_pct,
            discount_pct,
            reward_mode
          )
        `)
        .eq('id', grab_id)
        .single();

      if (grab?.deals) {
        dealData = grab.deals;
        if (dealData.cashback_pct) {
          cashbackPct = parseFloat(dealData.cashback_pct);
        }
      }
    }

    // Calculate cashback credits
    const finalAmount = parseFloat(transaction.final_amount);
    const totalCredits = Math.floor(finalAmount * (cashbackPct / 100));
    const localCredits = Math.floor(totalCredits * 0.7);
    const networkCredits = totalCredits - localCredits;

    // Update or create credits record
    const { data: existingCredits } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', user_id)
      .eq('merchant_id', merchantId)
      .single();

    if (existingCredits) {
      await supabase
        .from('credits')
        .update({
          local_cents: existingCredits.local_cents + localCredits - (local_credits_used || 0),
          network_cents: existingCredits.network_cents + networkCredits - (network_credits_used || 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCredits.id);
    } else {
      await supabase
        .from('credits')
        .insert({
          user_id,
          merchant_id: merchantId,
          local_cents: localCredits - (local_credits_used || 0),
          network_cents: networkCredits - (network_credits_used || 0)
        });
    }

    // Create credit event
    await supabase
      .from('credit_events')
      .insert({
        user_id,
        merchant_id: merchantId,
        grab_id,
        event_type: 'CREDIT_EARNED',
        local_cents_change: localCredits,
        network_cents_change: networkCredits,
        description: `Cashback from transaction ${paymentCode}`
      });

    // Update user totals
    await supabase
      .from('users')
      .update({
        local_credits: (existingCredits?.local_cents || 0) + localCredits - (local_credits_used || 0),
        network_credits: (existingCredits?.network_cents || 0) + networkCredits - (network_credits_used || 0),
        total_redemptions: 1,
        total_savings: (local_credits_used || 0) + (network_credits_used || 0)
      })
      .eq('user_id', user_id);

    // Mark grab as used if exists
    if (grab_id) {
      await supabase
        .from('grabs')
        .update({
          status: 'USED',
          used_at: new Date().toISOString()
        })
        .eq('id', grab_id);

      // Award tier points
      await supabase.rpc('award_tier_points', {
        p_user_id: user_id,
        p_grab_id: grab_id,
        p_merchant_id: merchantId
      });
    }

    // Send merchant notification
    try {
      await supabase.functions.invoke('sendMerchantNotification', {
        body: {
          merchantId,
          type: 'PAYMENT_CONFIRMED',
          payload: {
            amount: finalAmount,
            paymentCode,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to send merchant notification:', error);
    }

    console.log('Cash collection confirmed successfully for transaction:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cash collection confirmed successfully',
        transaction: {
          id: transaction.id,
          paymentCode,
          amount: finalAmount,
          creditsEarned: totalCredits,
          completedAt: new Date().toISOString()
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in confirmCashCollection:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});