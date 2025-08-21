import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  billAmount: number;
  merchantId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { billAmount, merchantId }: ValidationRequest = await req.json();

    if (!billAmount || billAmount <= 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valid bill amount is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate a 6-digit validation PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate transaction reference
    const txnRef = `JD-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Set expiry time (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const finalMerchantId = merchantId || '550e8400-e29b-41d4-a716-446655440003';
    const demoUserId = '550e8400-e29b-41d4-a716-446655440000'; // Demo user ID

    // Store the validation data in pending_transactions table
    const { data: transaction, error: insertError } = await supabase
      .from('pending_transactions')
      .insert({
        merchant_id: finalMerchantId,
        user_id: demoUserId,
        original_amount: billAmount,
        final_amount: billAmount,
        status: 'pending',
        payment_code: pin,
        expires_at: expiresAt.toISOString(),
        local_credits_used: 0,
        network_credits_used: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing validation code:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate validation code' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const validationData = {
      success: true,
      pin,
      txnRef,
      billAmount,
      merchantId: finalMerchantId,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      transactionId: transaction.id
    };

    console.log('Generated validation code:', {
      pin,
      txnRef,
      billAmount,
      expiresAt: expiresAt.toISOString()
    });

    return new Response(
      JSON.stringify(validationData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generateValidationCode function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});