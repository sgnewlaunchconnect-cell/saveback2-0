import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate HMAC signature for QR token
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

// Generate 6-digit PIN
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { dealId, anonymousUserId } = await req.json();
    console.log('createGrab called with:', { dealId, anonymousUserId });

    // Get authenticated user if Authorization header is present
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: user, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError) {
        console.error('Auth error:', authError);
      } else {
        userId = user.user?.id;
        console.log('Authenticated user:', userId);
      }
    }

    // Use demo user ID for anonymous users
    const userIdForQuery = userId || '550e8400-e29b-41d4-a716-446655440000';

    // Validate deal exists and is active
    const { data: deal, error: dealError } = await supabaseClient
      .from('deals')
      .select('*')
      .eq('id', dealId)
      .eq('is_active', true)
      .single();

    if (dealError || !deal) {
      console.error('Deal not found or inactive:', dealError);
      return new Response(JSON.stringify({ error: 'Deal not found or inactive' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if deal has expired
    if (deal.end_at && new Date(deal.end_at) <= new Date()) {
      console.log('Deal has expired:', deal.end_at);
      return new Response(JSON.stringify({ error: 'Deal has expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check stock availability
    if (deal.stock && deal.stock > 0) {
      const redemptions = deal.redemptions || 0;
      if (redemptions >= deal.stock) {
        console.log('Deal is sold out. Stock:', deal.stock, 'Redemptions:', redemptions);
        return new Response(JSON.stringify({ error: 'Deal is sold out' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check for existing active grab for this user and deal
    let existingGrabQuery = supabaseClient
      .from('grabs')
      .select('*')
      .eq('deal_id', dealId)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString());

    if (userId) {
      existingGrabQuery = existingGrabQuery.eq('user_id', userId);
    } else {
      existingGrabQuery = existingGrabQuery
        .eq('user_id', userIdForQuery)
        .eq('anon_user_id', anonymousUserId || '');
    }

    const { data: existingGrab, error: existingError } = await existingGrabQuery.single();

    if (existingGrab && !existingError) {
      console.log('User already has an active grab for this deal:', existingGrab.id);
      return new Response(JSON.stringify({ 
        grabId: existingGrab.id,
        message: 'You already have an active grab for this deal',
        grab: existingGrab
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate PIN and expiry
    const pin = generatePIN();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Generate QR token with HMAC signature
    const qrData = `${dealId}:${userIdForQuery}:${Date.now()}`;
    const secret = Deno.env.get('QR_SECRET') || 'fallback-secret-key';
    const signature = await generateHMAC(qrData, secret);
    const qrToken = `${qrData}:${signature}`;

    // Create grab record
    const { data: newGrab, error: createError } = await supabaseClient
      .from('grabs')
      .insert({
        deal_id: dealId,
        merchant_id: deal.merchant_id,
        user_id: userIdForQuery,
        anon_user_id: anonymousUserId,
        pin: pin,
        qr_token: qrToken,
        expires_at: expiresAt.toISOString(),
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating grab:', createError);
      return new Response(JSON.stringify({ error: 'Failed to create grab' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update deal grab count
    await supabaseClient
      .from('deals')
      .update({ grabs: (deal.grabs || 0) + 1 })
      .eq('id', dealId);

    console.log('Successfully created grab:', newGrab.id, 'for anonymous user:', anonymousUserId, 'deal:', dealId);

    return new Response(JSON.stringify({ 
      success: true,
      grabId: newGrab.id,
      grab: newGrab
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in createGrab:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});