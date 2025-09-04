import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateCreditSelectionRequest {
  paymentCode: string;
  localCreditsSelected: number;
  networkCreditsSelected: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentCode, localCreditsSelected, networkCreditsSelected }: UpdateCreditSelectionRequest = await req.json();

    // Validate input
    if (!paymentCode) {
      return new Response(
        JSON.stringify({ error: 'Payment code is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the pending transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('payment_code', paymentCode)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found or not accessible' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if transaction is expired
    if (new Date(transaction.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Transaction has expired' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user's available credits for this merchant
    const { data: credits, error: creditsError } = await supabase
      .from('credits')
      .select('local_cents, network_cents')
      .eq('user_id', user.id)
      .eq('merchant_id', transaction.merchant_id)
      .single();

    const availableLocalCredits = credits?.local_cents || 0;
    const availableNetworkCredits = credits?.network_cents || 0;

    // Validate credit selection doesn't exceed available credits
    if (localCreditsSelected > availableLocalCredits) {
      return new Response(
        JSON.stringify({ 
          error: 'Selected local credits exceed available balance',
          availableLocalCredits 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (networkCreditsSelected > availableNetworkCredits) {
      return new Response(
        JSON.stringify({ 
          error: 'Selected network credits exceed available balance',
          availableNetworkCredits 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate live net amount
    const totalCreditsUsed = localCreditsSelected + networkCreditsSelected;
    const liveNetAmount = Math.max(0, (transaction.final_amount || transaction.original_amount || 0) - totalCreditsUsed);

    // Update the transaction with customer's credit selection
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('pending_transactions')
      .update({
        customer_selected_local_credits: localCreditsSelected,
        customer_selected_network_credits: networkCreditsSelected,
        live_net_amount: liveNetAmount,
        customer_credit_selection_at: new Date().toISOString()
      })
      .eq('id', transaction.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update credit selection' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Credit selection updated for transaction ${transaction.id}: Local: ${localCreditsSelected}, Network: ${networkCreditsSelected}, Net: ${liveNetAmount}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction: updatedTransaction,
        liveNetAmount,
        totalCreditsUsed
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});