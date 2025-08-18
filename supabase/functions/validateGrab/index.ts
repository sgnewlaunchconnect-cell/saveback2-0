import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  qrToken?: string;
  pin?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { qrToken, pin }: ValidationRequest = await req.json();

    if (!qrToken && !pin) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Either qrToken or pin is required' 
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

    // Build query conditions
    let query = supabase
      .from('grabs')
      .select(`
        id,
        user_id,
        deal_id,
        merchant_id,
        status,
        pin,
        qr_token,
        expires_at,
        created_at,
        deals!inner(title, merchant_id, merchants!inner(name)),
        users!inner(display_name)
      `);

    // Add filter based on input type
    if (qrToken) {
      query = query.eq('qr_token', qrToken);
    } else {
      query = query.eq('pin', pin);
    }

    const { data: grabs, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Database error occurred' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!grabs || grabs.length === 0) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Grab not found' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const grab = grabs[0];
    const now = new Date();
    const expiresAt = new Date(grab.expires_at);

    // Check if grab has expired
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Grab has expired' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if grab has already been used
    if (grab.status !== 'LOCKED') {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: `Grab has already been ${grab.status.toLowerCase()}` 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validation successful - return grab details
    const validationResult = {
      isValid: true,
      grab: {
        id: grab.id,
        pin: grab.pin,
        qr_token: grab.qr_token,
        status: grab.status,
        expires_at: grab.expires_at,
        deal: {
          title: grab.deals.title,
          merchant: grab.deals.merchants.name
        },
        user: {
          display_name: grab.users.display_name
        }
      },
      message: 'Grab is valid and ready for redemption'
    };

    console.log('Grab validation successful:', {
      grabId: grab.id,
      userId: grab.user_id,
      merchantId: grab.merchant_id,
      validationType: qrToken ? 'QR' : 'PIN'
    });

    return new Response(
      JSON.stringify(validationResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in validateGrab function:', error);
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        message: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});