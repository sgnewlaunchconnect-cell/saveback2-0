import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('voidPendingTransaction called with method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentCode, merchantId, reason } = await req.json();
    console.log('voidPendingTransaction called with:', { paymentCode, merchantId, reason });

    if (!paymentCode || !merchantId) {
      return new Response(
        JSON.stringify({ error: 'Payment code and merchant ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('payment_code', paymentCode)
      .eq('merchant_id', merchantId)
      .in('status', ['pending', 'authorized'])
      .single();

    if (fetchError || !transaction) {
      console.error('Transaction not found:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Transaction not found or already processed',
          success: false 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If transaction was authorized, we need to release any locked credits
    if (transaction.status === 'authorized') {
      const { local_credits_used, network_credits_used, user_id } = transaction;
      
      if (local_credits_used || network_credits_used) {
        // Return credits to user
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
              local_cents: existingCredits.local_cents + (local_credits_used || 0),
              network_cents: existingCredits.network_cents + (network_credits_used || 0),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCredits.id);
        }

        // Update user totals to restore credits
        await supabase
          .from('users')
          .update({
            local_credits: (existingCredits?.local_cents || 0) + (local_credits_used || 0),
            network_credits: (existingCredits?.network_cents || 0) + (network_credits_used || 0)
          })
          .eq('user_id', user_id);

        // Create credit event for the restoration
        await supabase
          .from('credit_events')
          .insert({
            user_id,
            merchant_id: merchantId,
            grab_id: transaction.grab_id,
            event_type: 'CREDIT_RESTORED',
            local_cents_change: local_credits_used || 0,
            network_cents_change: network_credits_used || 0,
            description: `Credits restored from voided transaction ${paymentCode} - ${reason || 'Customer did not pay'}`
          });
      }
    }

    // Mark transaction as voided
    const { error: updateError } = await supabase
      .from('pending_transactions')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error voiding transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to void transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send merchant notification
    try {
      await supabase.functions.invoke('sendMerchantNotification', {
        body: {
          merchantId,
          type: 'TRANSACTION_VOIDED',
          payload: {
            paymentCode,
            reason: reason || 'Customer did not pay',
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Failed to send merchant notification:', error);
    }

    console.log('Transaction voided successfully:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction voided successfully',
        transaction: {
          id: transaction.id,
          paymentCode,
          voidedAt: new Date().toISOString(),
          reason: reason || 'Customer did not pay'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in voidPendingTransaction:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});