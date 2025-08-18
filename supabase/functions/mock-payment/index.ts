import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  billAmount: number;
  creditsUsed: number;
  finalAmount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { billAmount, creditsUsed, finalAmount }: PaymentRequest = await req.json();
    
    console.log(`Processing mock payment: $${finalAmount}`);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a mock payment code
    const paymentCode = `PAY${Date.now().toString().slice(-6)}`;
    
    // Simulate 95% success rate
    const isSuccess = Math.random() > 0.05;
    
    if (isSuccess) {
      return new Response(JSON.stringify({
        success: true,
        paymentCode,
        billAmount,
        creditsUsed,
        finalAmount,
        message: "Payment processed successfully"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Payment failed - insufficient funds or network error"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
  } catch (error) {
    console.error('Mock payment error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: "Payment processing failed"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});