import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditTransactionRequest {
  userId: string;
  merchantId: string;
  originalAmount: number; // in cents
  localCreditsToUse: number; // in cents
  networkCreditsToUse: number; // in cents
  finalAmount: number; // in cents
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      userId, 
      merchantId, 
      originalAmount, 
      localCreditsToUse, 
      networkCreditsToUse, 
      finalAmount 
    }: CreditTransactionRequest = await req.json();

    console.log('Processing credit transaction:', {
      userId,
      merchantId,
      originalAmount,
      localCreditsToUse,
      networkCreditsToUse,
      finalAmount
    });

    // Step 1: Verify user has sufficient credits
    const { data: userCredits, error: creditsError } = await supabase
      .from('credits')
      .select('local_cents, network_cents')
      .eq('user_id', userId)
      .eq('merchant_id', merchantId)
      .single();

    if (creditsError) {
      console.error('Error fetching user credits:', creditsError);
      throw new Error('Unable to verify credit balance');
    }

    // Verify sufficient local credits
    if (localCreditsToUse > userCredits.local_cents) {
      throw new Error('Insufficient local credits');
    }

    // Step 2: Get total network credits across all merchants
    const { data: allNetworkCredits, error: networkError } = await supabase
      .from('credits')
      .select('network_cents')
      .eq('user_id', userId);

    if (networkError) {
      console.error('Error fetching network credits:', networkError);
      throw new Error('Unable to verify network credit balance');
    }

    const totalNetworkCredits = allNetworkCredits.reduce(
      (sum, credit) => sum + credit.network_cents, 
      0
    );

    // Verify sufficient network credits
    if (networkCreditsToUse > totalNetworkCredits) {
      throw new Error('Insufficient network credits');
    }

    // Step 3: Process the transaction in a database transaction
    const { error: transactionError } = await supabase.rpc('process_credit_payment', {
      p_user_id: userId,
      p_merchant_id: merchantId,
      p_original_amount: originalAmount,
      p_local_credits_used: localCreditsToUse,
      p_network_credits_used: networkCreditsToUse,
      p_final_amount: finalAmount
    });

    if (transactionError) {
      console.error('Transaction error:', transactionError);
      throw new Error('Transaction failed');
    }

    // Step 4: Create credit events for tracking
    const events = [];
    
    if (localCreditsToUse > 0) {
      events.push({
        user_id: userId,
        merchant_id: merchantId,
        event_type: 'CREDIT_USED',
        description: 'Local credits used for payment',
        local_cents_change: -localCreditsToUse,
        network_cents_change: 0
      });
    }

    if (networkCreditsToUse > 0) {
      events.push({
        user_id: userId,
        merchant_id: merchantId,
        event_type: 'CREDIT_USED',
        description: 'Network credits used for payment',
        local_cents_change: 0,
        network_cents_change: -networkCreditsToUse
      });
    }

    if (events.length > 0) {
      const { error: eventError } = await supabase
        .from('credit_events')
        .insert(events);

      if (eventError) {
        console.error('Error creating credit events:', eventError);
        // Don't fail the transaction for event logging errors
      }
    }

    // Step 5: If there's a final amount, simulate earning new credits (2% cashback)
    if (finalAmount > 0) {
      const newLocalCredits = Math.floor(finalAmount * 0.02); // 2% local cashback
      const newNetworkCredits = Math.floor(finalAmount * 0.01); // 1% network cashback

      // Update credits
      const { error: updateError } = await supabase
        .from('credits')
        .upsert({
          user_id: userId,
          merchant_id: merchantId,
          local_cents: userCredits.local_cents - localCreditsToUse + newLocalCredits,
          network_cents: userCredits.network_cents + newNetworkCredits
        });

      if (updateError) {
        console.error('Error updating credits:', updateError);
      }

      // Create credit earning events
      if (newLocalCredits > 0 || newNetworkCredits > 0) {
        const { error: earnEventError } = await supabase
          .from('credit_events')
          .insert({
            user_id: userId,
            merchant_id: merchantId,
            event_type: 'CREDIT_EARNED',
            description: `Cashback from $${(finalAmount / 100).toFixed(2)} purchase`,
            local_cents_change: newLocalCredits,
            network_cents_change: newNetworkCredits
          });

        if (earnEventError) {
          console.error('Error creating earn event:', earnEventError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Credit transaction processed successfully',
        creditsUsed: {
          local: localCreditsToUse,
          network: networkCreditsToUse,
          total: localCreditsToUse + networkCreditsToUse
        },
        amountCharged: finalAmount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing credit transaction:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});