
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
    const { paymentCode, merchantId, captureNow, merchantEnteredAmount } = await req.json();
    
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
    
    // Check if this is demo mode
    const isDemoMode = merchantId === null;

    console.log('validatePendingTransaction called with:', { paymentCode, merchantId, isDemoMode, captureNow });

    if (!paymentCode) {
      return new Response(
        JSON.stringify({ error: 'paymentCode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Find the pending transaction with properly joined related tables using the new foreign keys
    let query = supabase
      .from('pending_transactions')
      .select(`
        *,
        merchants (
          id,
          name,
          default_cashback_pct,
          psp_enabled
        )
      `)
      .eq('payment_code', paymentCode);

    // Add merchant verification if merchantId is provided
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }

    const { data: transaction, error: transactionError } = await query.single();

    if (transactionError || !transaction) {
      console.error('Transaction not found or merchant mismatch:', transactionError);
      
      // Provide more specific error messages
      if (merchantId && transactionError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Payment code not found for this merchant' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
          message: 'Transaction already completed',
          awaitingConfirmation: transaction.status === 'authorized'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect payment method - check if merchant has PSP enabled
    const isPspPayment = transaction.merchants?.psp_enabled && transaction.final_amount > 0;
    const isCashPayment = !isPspPayment;

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(transaction.expires_at);
    if (now > expiresAt) {
      // Mark as expired
      await supabase
        .from('pending_transactions')
        .update({ status: 'expired' })
        .eq('payment_code', paymentCode);

      return new Response(
        JSON.stringify({ 
          error: 'Payment code has expired',
          requiresNewCode: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle zero-amount transactions (fully covered by credits) - auto-complete
    if (transaction.final_amount === 0 || transaction.final_amount === '0') {
      console.log('Zero amount transaction detected, auto-completing...');
      
      // Get deal info if needed for cashback calculation
      let dealInfo = null;
      let cashbackPct = transaction.merchants?.default_cashback_pct || 5;
      
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
      
      // Calculate cashback on original amount (since final amount is 0)
      const localCreditsEarned = Math.round((transaction.original_amount * cashbackPct / 100) * 100);
      const networkCreditsEarned = 0; // For now, only local credits for cashback
      
      // Update transaction to completed immediately
      const { error: updateError } = await supabase
        .from('pending_transactions')
        .update({ 
          status: 'completed',
          authorized_at: now.toISOString(),
          captured_at: now.toISOString()
        })
        .eq('payment_code', paymentCode);

      if (updateError) {
        console.error('Error updating zero-amount transaction:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to complete transaction' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Award cashback credits if any
      if (localCreditsEarned > 0) {
        const { error: creditError } = await supabase
          .from('credits')
          .upsert({
            user_id: transaction.user_id,
            merchant_id: transaction.merchant_id,
            local_cents: localCreditsEarned,
            network_cents: 0
          }, {
            onConflict: 'user_id,merchant_id',
            ignoreDuplicates: false
          });

        if (!creditError) {
          // Create credit event
          await supabase
            .from('credit_events')
            .insert({
              user_id: transaction.user_id,
              grab_id: transaction.grab_id,
              merchant_id: transaction.merchant_id,
              event_type: 'CREDIT_EARNED',
              local_cents_change: localCreditsEarned,
              network_cents_change: 0,
              description: `Cashback from ${transaction.merchants.name}`
            });

          // Update user totals
          await supabase
            .from('users')
            .update({
              local_credits: supabase.rpc('increment', { x: localCreditsEarned }),
              total_redemptions: supabase.rpc('increment', { x: 1 }),
              total_savings: supabase.rpc('increment', { x: transaction.original_amount })
            })
            .eq('user_id', transaction.user_id);
        }
      }

      // Mark grab as used if applicable
      if (transaction.grab_id) {
        await supabase
          .from('grabs')
          .update({ 
            status: 'USED',
            used_at: now.toISOString()
          })
          .eq('id', transaction.grab_id);

        // Award tier points
        try {
          await supabase.rpc('award_tier_points', {
            p_user_id: transaction.user_id,
            p_grab_id: transaction.grab_id,
            p_merchant_id: transaction.merchant_id
          });
        } catch (tierError) {
          console.error('Error awarding tier points:', tierError);
        }
      }

      // Send merchant notification
      try {
        await supabase.functions.invoke('sendMerchantNotification', {
          body: {
            merchantId: transaction.merchant_id,
            type: 'PAYMENT_COMPLETED',
            payload: {
              paymentCode,
              amount: transaction.original_amount,
              finalAmount: transaction.final_amount,
              method: 'zero_amount_auto',
              completedAt: now.toISOString()
            }
          }
        });
      } catch (notifError) {
        console.error('Error sending merchant notification:', notifError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'FREE transaction completed automatically',
          data: {
            status: 'completed',
            paymentCode,
            amount: transaction.original_amount,
            finalAmount: transaction.final_amount,
            merchantName: transaction.merchants.name,
            cashbackEarned: localCreditsEarned / 100,
            autoCompleted: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Flow 2 (merchant-keyed amount) - update transaction with merchant-entered amount
    if (transaction.amount_entry_mode === 'merchant' && merchantEnteredAmount) {
      // Update the transaction with the merchant-entered amount
      const { error: updateAmountError } = await supabase
        .from('pending_transactions')
        .update({ 
          original_amount: merchantEnteredAmount,
          final_amount: merchantEnteredAmount, // For Flow 2, no pre-applied credits
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateAmountError) {
        console.error('Error updating transaction amount:', updateAmountError);
        return new Response(
          JSON.stringify({ error: 'Failed to update transaction amount' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Update our local transaction object for further processing
      transaction.original_amount = merchantEnteredAmount;
      transaction.final_amount = merchantEnteredAmount;
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

    // Calculate credit amounts based on the final original_amount
    const effectiveAmount = transaction.original_amount || 0;
    const totalCredits = Math.floor((effectiveAmount * cashbackPct) / 100);
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
      // Note: Credit deductions are handled in confirmCashCollection, not here
      // This validation step only marks the transaction as authorized/validated
      
      // For cash payments, mark as validated and wait for confirmation
      // For PSP payments, mark as validated (completed)
      // If captureNow is true, complete cash payments immediately
      const shouldCapture = !isCashPayment || captureNow;
      const newStatus = shouldCapture ? 'completed' : 'validated';
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (isCashPayment) {
        updateData.authorized_at = new Date().toISOString();
        if (captureNow) {
          updateData.captured_at = new Date().toISOString();
        }
      } else {
        updateData.captured_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('pending_transactions')
        .update(updateData)
        .eq('id', transaction.id);

      if (updateError) {
        throw new Error(`Failed to update transaction: ${updateError.message}`);
      }

      // Award cashback only for PSP payments or if captureNow is true for cash payments
      // Regular cash payments get cashback when confirmed later in confirmCashCollection
      if (transaction.user_id && totalCredits > 0 && (!isCashPayment || captureNow)) {
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
          console.error('Failed to award credits:', creditsError);
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
            grab_id: transaction.deal_id ? null : undefined
          });

        if (eventError) {
          console.error('Failed to create credit event:', eventError);
        }

        // Update user totals
        const { data: currentUser, error: getUserError } = await supabase
          .from('users')
          .select('local_credits, network_credits, total_redemptions, total_savings')
          .eq('user_id', transaction.user_id)
          .single();

        if (!getUserError && currentUser) {
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

      // Auto-consume grab for PSP payments immediately, or cash payments if captureNow is true
      // Otherwise cash payments consume grab on confirmation
      if (transaction.grab_id && (!isCashPayment || captureNow)) {
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
      const notificationType = shouldCapture ? 'PAYMENT_COMPLETED' : 'PAYMENT_AUTHORIZED';
      try {
        await supabase.functions.invoke('sendMerchantNotification', {
          body: {
            merchantId: transaction.merchant_id,
            type: notificationType,
            payload: {
              transactionId: transaction.id,
              paymentCode: paymentCode,
              amount: transaction.original_amount,
              finalAmount: transaction.final_amount,
              creditsEarned: shouldCapture ? totalCredits : 0, // Captured payments get credits immediately
              dealTitle: dealInfo?.title,
              awaitingConfirmation: !shouldCapture
            }
          }
        });
      } catch (notificationError) {
        console.error('Failed to send merchant notification:', notificationError);
        // Don't fail the transaction for notification errors
      }

        console.log('Successfully processed transaction:', {
          transactionId: transaction.id,
          status: newStatus,
          awaitingConfirmation: !shouldCapture,
          creditsEarned: shouldCapture ? totalCredits : 0
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: isDemoMode ? 'Demo transaction validated' : (shouldCapture ? 'Transaction completed successfully' : 'Transaction validated - awaiting cash collection'),
            data: {
              transactionId: transaction.id,
              merchantName: transaction.merchants?.name,
              originalAmount: transaction.original_amount,
              finalAmount: transaction.final_amount,
              cashbackPct,
              localCredits: shouldCapture ? localCredits : 0,
              networkCredits: shouldCapture ? networkCredits : 0,
              totalCredits: shouldCapture ? totalCredits : 0,
              dealTitle: dealInfo?.title,
              status: newStatus,
              awaitingConfirmation: !shouldCapture
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
