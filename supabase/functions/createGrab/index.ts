import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo secret for HMAC signing - in production this should be a real secret
const DEMO_SECRET = 'demo-grab-token-secret-key-12345';

async function generateHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { dealId } = await req.json();

    if (!dealId) {
      throw new Error('Deal ID is required');
    }

    // Validate deal exists and is active
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select(`
        *,
        merchants (
          id,
          name
        )
      `)
      .eq('id', dealId)
      .eq('is_active', true)
      .single();

    if (dealError || !deal) {
      throw new Error('Deal not found or inactive');
    }

    // Check if deal is expired
    if (deal.end_at && new Date(deal.end_at) < new Date()) {
      throw new Error('Deal has expired');
    }

    // Generate PIN and create grab token data
    const pin = generatePIN();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    // Create token data for HMAC
    const tokenData = JSON.stringify({
      dealId: deal.id,
      userId: user.id,
      merchantId: deal.merchant_id,
      pin,
      expiresAt: expiresAt.toISOString()
    });

    // Generate HMAC-signed token
    const signature = await generateHMAC(tokenData, DEMO_SECRET);
    const qrToken = `${btoa(tokenData)}.${signature}`;

    // Create grab record
    const { data: grab, error: grabError } = await supabaseClient
      .from('grabs')
      .insert({
        user_id: user.id,
        deal_id: deal.id,
        merchant_id: deal.merchant_id,
        pin,
        qr_token: qrToken,
        expires_at: expiresAt.toISOString(),
        status: 'LOCKED'
      })
      .select()
      .single();

    if (grabError) {
      console.error('Error creating grab:', grabError);
      throw new Error('Failed to create grab');
    }

    // Update deal grabs count
    await supabaseClient
      .from('deals')
      .update({ grabs: (deal.grabs || 0) + 1 })
      .eq('id', dealId);

    // Return grab data
    return new Response(JSON.stringify({
      success: true,
      grab: {
        id: grab.id,
        qrToken,
        pin,
        expiresAt: expiresAt.toISOString(),
        countdown: 300, // 5 minutes in seconds
        deal: {
          title: deal.title,
          merchant: deal.merchants?.name
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in createGrab function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});