
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
    // Use service role for anonymous operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { dealId, anonymousUserId } = await req.json();

    if (!dealId) {
      throw new Error('Deal ID is required');
    }

    if (!anonymousUserId) {
      throw new Error('Anonymous user ID is required');
    }

    // Try to get authenticated user if auth header is present
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (user) {
          userId = user.id;
        }
      } catch (authError) {
        // Ignore auth errors, continue with anonymous user
        console.log('Auth failed, using anonymous user:', authError);
      }
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

    // Check stock availability (only if stock is limited)
    if (deal.stock && deal.stock > 0) {
      const currentRedemptions = deal.redemptions || 0;
      if (currentRedemptions >= deal.stock) {
        throw new Error('Deal is sold out');
      }
    }

    // Check for existing active grab
    let existingGrabQuery = supabaseClient
      .from('grabs')
      .select('*')
      .eq('deal_id', dealId)
      .eq('status', 'ACTIVE')
      .gt('expires_at', new Date().toISOString());

    if (userId) {
      // For authenticated users, check by user_id
      existingGrabQuery = existingGrabQuery.eq('user_id', userId);
    } else {
      // For anonymous users, check by anon_user_id
      existingGrabQuery = existingGrabQuery.eq('anon_user_id', anonymousUserId);
    }

    const { data: existingGrab } = await existingGrabQuery.single();

    if (existingGrab) {
      // Return existing grab instead of creating new one
      const expiresAt = new Date(existingGrab.expires_at);
      const countdown = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      
      return new Response(JSON.stringify({
        success: true,
        grab: {
          id: existingGrab.id,
          qrToken: existingGrab.qr_token,
          pin: existingGrab.pin,
          expiresAt: existingGrab.expires_at,
          countdown,
          deal: {
            title: deal.title,
            merchant: deal.merchants?.name
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate PIN and create grab token data
    const pin = generatePIN();
    
    // Set expiry to earlier of deal end time or 24 hours from now
    const dealEndTime = deal.end_at ? new Date(deal.end_at) : null;
    const maxGrabTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const expiresAt = dealEndTime && dealEndTime < maxGrabTime ? dealEndTime : maxGrabTime;
    
    // Create token data for HMAC
    const tokenData = JSON.stringify({
      dealId: deal.id,
      userId: userId || anonymousUserId,
      merchantId: deal.merchant_id,
      pin,
      expiresAt: expiresAt.toISOString()
    });

    // Generate HMAC-signed token
    const signature = await generateHMAC(tokenData, DEMO_SECRET);
    const qrToken = `${btoa(tokenData)}.${signature}`;

    // Create grab record with proper user handling
    const grabData: any = {
      deal_id: deal.id,
      merchant_id: deal.merchant_id,
      pin,
      qr_token: qrToken,
      expires_at: expiresAt.toISOString(),
      status: 'ACTIVE'
    };

    if (userId) {
      grabData.user_id = userId;
    } else {
      grabData.anon_user_id = anonymousUserId;
    }

    const { data: grab, error: grabError } = await supabaseClient
      .from('grabs')
      .insert(grabData)
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
        countdown: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
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
