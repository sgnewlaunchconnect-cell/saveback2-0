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
    const { paymentCode } = await req.json();

    console.log('validatePendingTransaction called with payment code:', paymentCode);

    if (!paymentCode) {
      return new Response(
        JSON.stringify({ error: 'paymentCode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the pending transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('pending_transactions')
      .select(`
        *,
        deals (
          id,
          title,
          cashback_pct,
          discount_pct
        ),
        merchants (
          id,
          name,
          default_cashback_pct
        )
      `)
      .eq('payment_code', paymentCode)
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction not found:', transactionError);
      return new Response(
        JSON.stringify({ error: 'Invalid payment code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already processed (idempotency)
    if (transaction.status !== 'pending') {
      console.log('Transaction already processed:', transaction.status);
      return new Response(
        JSON.stringify({
          success: true,
          alreadyProcessed: true,
          message: 'Transaction already completed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(transaction.expires_at);
    if (now > expiresAt) {
      console.log('Transaction expired at:', expiresAt);
      return new Response(
        JSON.stringify({ error: 'Payment code has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate cashback percentage (priority: deal > merchant default > 5%)
    let cashbackPct = 5; // Default fallback
    if (transaction.deals?.cashback_pct) {
      cashbackPct = transaction.deals.cashback_pct;
    } else if (transaction.merchants?.default_cashback_pct) {
      cashbackPct = transaction.merchants.default_cashback_pct;
    }

    // Calculate credit amounts
    const totalCredits = Math.floor((transaction.original_amount * cashbackPct) / 100);
    const localCredits = Math.floor(totalCredits * 0.7); // 70% local
    const networkCredits = totalCredits - localCredits; // 30% network

    console.log('Credit calculation:', {
      originalAmount: transaction.original_amount,
      cashbackPct,
      totalCredits,
      localCredits,
      networkCredits
    });

    // Start transaction to update everything atomically
    try {
      // Process credit deductions if credits were used
      if ((transaction.local_credits_used > 0 || transaction.network_credits_used > 0) && transaction.user_id) {
        // Use the existing credit processing function to deduct credits
        const { error: creditError } = await supabase.rpc('process_credit_payment', {
          p_user_id: transaction.user_id,
          p_merchant_id: transaction.merchant_id,
          p_original_amount: Math.round(transaction.original_amount * 100), // Convert to cents
          p_local_credits_used: Math.round(transaction.local_credits_used * 100), // Convert to cents
          p_network_credits_used: Math.round(transaction.network_credits_used * 100), // Convert to cents
          p_final_amount: Math.round(transaction.final_amount * 100) // Convert to cents
        });

        if (creditError) {
          console.error('Error processing credit deduction:', creditError);
          throw new Error(`Failed to deduct credits: ${creditError.message}`);
        }
      }

      // Mark transaction as completed
      const { error: updateError } = await supabase
        .from('pending_transactions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) {
        throw new Error(`Failed to update transaction: ${updateError.message}`);
      }

      // Only process credits if user is not null (skip for demo/anonymous)
      if (transaction.user_id && totalCredits > 0) {
        // Upsert credits for this merchant
        const { error: creditsError } = await supabase
          .from('credits')
          .upsert({
            user_id: transaction.user_id,
            merchant_id: transaction.merchant_id,
            local_cents: localCredits,
            network_cents: networkCredits
          }, {
            onConflict: 'user_id,merchant_id',
            ignoreDuplicates: false
          });

        if (creditsError) {
          // If upsert failed, try to add to existing credits
          const { error: incrementError } = await supabase.rpc('process_credit_payment', {
            p_user_id: transaction.user_id,
            p_merchant_id: transaction.merchant_id,
            p_original_amount: transaction.original_amount,
            p_local_credits_used: -localCredits, // Negative to add credits
            p_network_credits_used: -networkCredits,
            p_final_amount: transaction.final_amount
          });

          if (incrementError) {
            console.error('Failed to increment credits:', incrementError);
          }
        }

        // Create credit event record
        const { error: eventError } = await supabase
          .from('credit_events')
          .insert({
            user_id: transaction.user_id,
            merchant_id: transaction.merchant_id,
            event_type: 'CREDIT_EARNED',
            local_cents_change: localCredits,
            network_cents_change: networkCredits,
            description: `Cashback from ${transaction.merchants?.name} - ${cashbackPct}% on $${(transaction.original_amount / 100).toFixed(2)}`,
            grab_id: transaction.deal_id ? null : undefined // Only set if we have a deal
          });

        if (eventError) {
          console.error('Failed to create credit event:', eventError);
        }

        // Update user totals
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            local_credits: supabase.raw(`local_credits + ${localCredits}`),
            network_credits: supabase.raw(`network_credits + ${networkCredits}`),
            total_redemptions: supabase.raw('total_redemptions + 1'),
            total_savings: supabase.raw(`total_savings + ${totalCredits}`)
          })
          .eq('user_id', transaction.user_id);

        if (userUpdateError) {
          console.error('Failed to update user totals:', userUpdateError);
        }
      }

      // If this was from a grab, mark it as redeemed
      if (transaction.deal_id) {
        // Find grab by deal_id and user_id/anon_user_id
        const grabFilter = transaction.user_id
          ? { user_id: transaction.user_id, deal_id: transaction.deal_id }
          : { anon_user_id: { neq: null }, deal_id: transaction.deal_id };

        const { error: grabUpdateError } = await supabase
          .from('grabs')
          .update({ 
            status: 'REDEEMED',
            used_at: new Date().toISOString()
          })
          .match(grabFilter)
          .eq('status', 'ACTIVE');

        if (grabUpdateError) {
          console.error('Failed to update grab status:', grabUpdateError);
        }
      }

      console.log('Successfully validated transaction and released credits:', {
        transactionId: transaction.id,
        localCredits,
        networkCredits,
        totalCredits
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transactionId: transaction.id,
            merchantName: transaction.merchants?.name,
            originalAmount: transaction.original_amount,
            cashbackPct,
            localCredits,
            networkCredits,
            totalCredits,
            dealTitle: transaction.deals?.title
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error during transaction processing:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to process transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in validatePendingTransaction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});