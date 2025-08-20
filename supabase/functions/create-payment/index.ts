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
    console.log("=== Create Payment Request ===");
    
    // Parse request body
    const { 
      merchantId, 
      originalAmount, 
      grabId, 
      dealId, 
      anonymousUserId, 
      localCreditsUsed = 0, 
      networkCreditsUsed = 0 
    } = await req.json();

    console.log("Request params:", { 
      merchantId, 
      originalAmount, 
      grabId, 
      dealId, 
      localCreditsUsed, 
      networkCreditsUsed 
    });

    if (!merchantId || !originalAmount) {
      throw new Error("Missing required fields: merchantId, originalAmount");
    }

    // Initialize Supabase client with service role key
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Use demo user for anonymous users
    const userId = anonymousUserId ? '550e8400-e29b-41d4-a716-446655440000' : 
      (() => {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");
        // For now, use demo user - in production this would parse JWT
        return '550e8400-e29b-41d4-a716-446655440000';
      })();

    // Fetch merchant data including PSP settings (force fresh read)
    const { data: merchant, error: merchantError } = await supabaseServiceClient
      .from('merchants')
      .select('*')
      .eq('id', merchantId)
      .maybeSingle();

    if (merchantError || !merchant) {
      console.error("Error fetching merchant:", merchantError);
      throw new Error("Merchant not found");
    }

    console.log("Merchant:", merchant.name, "PSP enabled:", merchant.psp_enabled);

    // Remove this check for now to allow all merchants
    // if (!merchant.psp_enabled) {
    //   throw new Error("Merchant does not support PSP payments");
    // }

    // Calculate final amount after credits
    const finalAmount = Math.max(0, originalAmount - localCreditsUsed - networkCreditsUsed);
    
    // Calculate PSP fee
    const feeFixed = merchant.psp_fee_fixed_cents || 30;
    const feePct = merchant.psp_fee_pct || 2.9;
    const feeAmount = Math.round(feeFixed + (finalAmount * feePct / 100));
    
    // Determine total amount based on fee mode
    let totalAmount = finalAmount;
    if (merchant.psp_fee_mode === 'pass') {
      totalAmount = finalAmount + feeAmount;
    }

    console.log("Amounts:", { originalAmount, finalAmount, feeAmount, totalAmount, feeMode: merchant.psp_fee_mode });

    // Create pending transaction first
    const { data: pendingTransaction, error: transactionError } = await supabaseServiceClient
      .from('pending_transactions')
      .insert({
        user_id: userId,
        merchant_id: merchantId,
        deal_id: dealId,
        original_amount: originalAmount,
        final_amount: totalAmount, // Total amount including fees if passed to customer
        local_credits_used: localCreditsUsed,
        network_credits_used: networkCreditsUsed,
        credits_applied: localCreditsUsed + networkCreditsUsed,
        status: 'pending'
      })
      .select()
      .single();

    if (transactionError || !pendingTransaction) {
      console.error("Error creating pending transaction:", transactionError);
      throw new Error("Failed to create pending transaction");
    }

    console.log("Created pending transaction:", pendingTransaction.id);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Create PaymentIntent for in-app payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "inr",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        pending_transaction_id: pendingTransaction.id,
        merchant_id: merchantId,
        grab_id: grabId || "",
        deal_id: dealId || ""
      }
    });

    console.log("Created PaymentIntent:", paymentIntent.id);

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      pendingTransactionId: pendingTransaction.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});