import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IssueCreditRequest {
  grabId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grabId }: IssueCreditRequest = await req.json();

    if (!grabId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'grabId is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get grab details with deal information
    const { data: grab, error: grabError } = await supabase
      .from('grabs')
      .select(`
        id,
        user_id,
        deal_id,
        merchant_id,
        status,
        deals!inner(
          title,
          cashback_pct,
          discount_pct,
          reward_mode
        )
      `)
      .eq('id', grabId)
      .eq('status', 'LOCKED')
      .single();

    if (grabError || !grab) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Grab not found or already processed' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate reward amount (using a base amount for demo)
    // In production, this would be based on actual transaction amount
    const baseAmount = 1000; // 10.00 in cents for demo
    const rewardPct = grab.deals.cashback_pct || 5; // Default 5% if not set
    const totalRewardCents = Math.floor(baseAmount * (rewardPct / 100));

    // Split 70/30: 70% local, 30% network
    const localCents = Math.floor(totalRewardCents * 0.7);
    const networkCents = totalRewardCents - localCents;

    console.log('Credit calculation:', {
      grabId,
      userId: grab.user_id,
      merchantId: grab.merchant_id,
      baseAmount,
      rewardPct,
      totalRewardCents,
      localCents,
      networkCents
    });

    // Use transaction to ensure atomicity
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    
    try {
      // Upsert credits for the specific merchant (local credits)
      const { error: creditsError } = await supabase
        .from('credits')
        .upsert({
          user_id: grab.user_id,
          merchant_id: grab.merchant_id,
          local_cents: localCents,
          network_cents: 0
        }, {
          onConflict: 'user_id,merchant_id',
          ignoreDuplicates: false
        });

      if (creditsError) {
        console.error('Credits upsert error:', creditsError);
        throw creditsError;
      }

      // Handle network credits (using a special merchant ID or separate tracking)
      const NETWORK_MERCHANT_ID = '00000000-0000-0000-0000-000000000000'; // Special UUID for network credits
      
      const { error: networkCreditsError } = await supabase
        .from('credits')
        .upsert({
          user_id: grab.user_id,
          merchant_id: NETWORK_MERCHANT_ID,
          local_cents: 0,
          network_cents: networkCents
        }, {
          onConflict: 'user_id,merchant_id',
          ignoreDuplicates: false
        });

      if (networkCreditsError) {
        console.error('Network credits upsert error:', networkCreditsError);
        throw networkCreditsError;
      }

      // Log the credit event
      const { error: eventError } = await supabase
        .from('credit_events')
        .insert({
          user_id: grab.user_id,
          merchant_id: grab.merchant_id,
          grab_id: grabId,
          event_type: 'CREDIT_EARNED',
          local_cents_change: localCents,
          network_cents_change: networkCents,
          description: `Credits earned from ${grab.deals.title}`
        });

      if (eventError) {
        console.error('Event logging error:', eventError);
        throw eventError;
      }

      // Mark grab as processed/redeemed
      const { error: grabUpdateError } = await supabase
        .from('grabs')
        .update({ status: 'REDEEMED' })
        .eq('id', grabId);

      if (grabUpdateError) {
        console.error('Grab update error:', grabUpdateError);
        throw grabUpdateError;
      }

      // Commit transaction
      await supabase.rpc('commit_transaction');

      const response = {
        success: true,
        message: 'Credits issued successfully! Your Tower grew.',
        credits: {
          localCents,
          networkCents,
          totalCents: totalRewardCents,
          merchantName: grab.deals.title,
          rewardPct
        }
      };

      console.log('Credits issued successfully:', response);

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (transactionError) {
      // Rollback transaction on error
      await supabase.rpc('rollback_transaction');
      throw transactionError;
    }

  } catch (error) {
    console.error('Error in issueCredits function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});