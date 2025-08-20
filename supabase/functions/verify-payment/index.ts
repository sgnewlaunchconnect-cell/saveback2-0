import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Verify Payment Request ===");
    
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Missing sessionId");
    }

    console.log("Verifying session:", sessionId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log("Session status:", session.payment_status, "Amount:", session.amount_total);

    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Get pending transaction ID from metadata
    const pendingTransactionId = session.metadata?.pending_transaction_id;
    if (!pendingTransactionId) {
      throw new Error("No pending transaction ID found in session metadata");
    }

    // Initialize Supabase client with service role key
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Use existing validatePendingTransaction function by creating a payment code for the transaction
    // First, get the pending transaction
    const { data: pendingTransaction, error: fetchError } = await supabaseServiceClient
      .from('pending_transactions')
      .select('*')
      .eq('id', pendingTransactionId)
      .single();

    if (fetchError || !pendingTransaction) {
      console.error("Error fetching pending transaction:", fetchError);
      throw new Error("Pending transaction not found");
    }

    console.log("Found pending transaction:", pendingTransaction.payment_code);

    // Call the existing validatePendingTransaction function via edge function
    const { data: validationResult, error: validationError } = await supabaseServiceClient.functions.invoke(
      'validatePendingTransaction',
      { 
        body: { 
          paymentCode: pendingTransaction.payment_code 
        }
      }
    );

    if (validationError) {
      console.error("Error validating transaction:", validationError);
      throw new Error("Failed to validate payment");
    }

    console.log("Payment validated successfully:", validationResult);

    return new Response(JSON.stringify({ 
      success: true,
      transactionId: pendingTransactionId,
      paymentCode: pendingTransaction.payment_code,
      validationResult
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in verify-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});