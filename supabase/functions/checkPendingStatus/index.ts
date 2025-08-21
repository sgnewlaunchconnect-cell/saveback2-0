import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusCheckRequest {
  paymentCode: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentCode }: StatusCheckRequest = await req.json();

    if (!paymentCode) {
      return new Response(
        JSON.stringify({ error: 'paymentCode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check transaction status
    const { data: transaction, error } = await supabase
      .from('pending_transactions')
      .select(`
        id,
        status,
        expires_at,
        final_amount,
        authorized_at,
        captured_at,
        voided_at,
        merchants!inner(name)
      `)
      .eq('payment_code', paymentCode)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(transaction.expires_at);
    const isExpired = now > expiresAt;

    // If expired and still pending, update status
    if (isExpired && transaction.status === 'pending') {
      await supabase
        .from('pending_transactions')
        .update({ status: 'expired' })
        .eq('payment_code', paymentCode);
      
      transaction.status = 'expired';
    }

    const response = {
      status: transaction.status,
      isExpired,
      finalAmount: transaction.final_amount,
      merchantName: transaction.merchants.name,
      authorizedAt: transaction.authorized_at,
      capturedAt: transaction.captured_at,
      voidedAt: transaction.voided_at
    };

    console.log(`Status check for payment code ${paymentCode}:`, response);

    return new Response(
      JSON.stringify({ success: true, data: response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in checkPendingStatus:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});