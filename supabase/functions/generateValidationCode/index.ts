import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    // Generate a 6-digit validation PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate transaction reference
    const txnRef = `JD-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Set expiry time (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // For demo purposes, we'll create a simple validation code
    // In production, this would be cryptographically signed and stored in database
    const validationData = {
      success: true,
      pin,
      txnRef,
      billAmount,
      merchantId: merchantId || '550e8400-e29b-41d4-a716-446655440002', // Demo merchant
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString()
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