
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

    // Find the pending transaction with properly joined related tables using the new foreign keys
    const { data: transaction, error: transactionError } = await supabase
      .from('pending_transactions')
      .select(`
        *,
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

    // Get deal info if deal_id exists
    let dealInfo = null;
    let cashbackPct = transaction.merchants?.default_cashback_pct || 5; // Default 5%

    if (transaction.deal_id) {
      const { data: deal } = await supabase
        .from('deals')
        .select('id, title, cashback_pct, discount_pct')
        .eq('id', transaction.deal_id)
        .single();
      
      if (deal) {
        dealInfo = deal;
        cashbackPct = deal.cashback_pct || cashbackPct;
      }
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

      // Mark transaction as validated (for real-time updates)
      const { error: updateError } = await supabase
        .from('pending_transactions')
        .update({ 
          status: 'validated',
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

        // Update user totals - get current values first
        const { data: currentUser, error: getUserError } = await supabase
          .from('users')
          .select('local_credits, network_credits, total_redemptions, total_savings')
          .eq('user_id', transaction.user_id)
          .single();

        if (getUserError) {
          console.error('Failed to get current user totals:', getUserError);
        } else {
          const { error: userUpdateError } = await supabase
            .from('users')
            .update({
              local_credits: (currentUser.local_credits || 0) + localCredits,
              network_credits: (currentUser.network_credits || 0) + networkCredits,
              total_redemptions: (currentUser.total_redemptions || 0) + 1,
              total_savings: (currentUser.total_savings || 0) + totalCredits
            })
            .eq('user_id', transaction.user_id);

          if (userUpdateError) {
            console.error('Failed to update user totals:', userUpdateError);
          }
        }
      }

      // Auto-consume linked grab if present
      if (transaction.grab_id) {
        const { error: grabUpdateError } = await supabase
          .from('grabs')
          .update({ 
            status: 'USED',
            used_at: new Date().toISOString()
          })
          .eq('id', transaction.grab_id)
          .eq('status', 'ACTIVE'); // Only update if still ACTIVE

        if (grabUpdateError) {
          console.error('Failed to auto-consume grab:', grabUpdateError);
        } else {
          console.log('Auto-consumed grab:', transaction.grab_id);
        }

        // Award tier points if user is authenticated
        if (transaction.user_id && transaction.user_id !== '550e8400-e29b-41d4-a716-446655440000') {
          const { error: tierError } = await supabase.rpc('award_tier_points', {
            p_user_id: transaction.user_id,
            p_grab_id: transaction.grab_id,
            p_merchant_id: transaction.merchant_id
          });
          
          if (tierError) {
            console.error('Failed to award tier points:', tierError);
          }
        }
      }

      // Send merchant notification
      try {
        await supabase.functions.invoke('sendMerchantNotification', {
          body: {
            merchantId: transaction.merchant_id,
            type: 'PAYMENT_VALIDATED',
            payload: {
              transactionId: transaction.id,
              paymentCode: paymentCode,
              amount: transaction.original_amount,
              finalAmount: transaction.final_amount,
              creditsEarned: totalCredits,
              dealTitle: dealInfo?.title
            }
          }
        });
      } catch (notificationError) {
        console.error('Failed to send merchant notification:', notificationError);
        // Don't fail the transaction for notification errors
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
            dealTitle: dealInfo?.title
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Error during transaction processing:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process transaction',
          details: error.message 
        }),
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
