import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  title: string;
  message: string;
  userIds: string[];
  merchantId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, message, userIds, merchantId }: NotificationRequest = await req.json();

    if (!title || !message || !userIds || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Title, message, and userIds are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Sending push notifications:', {
      title,
      recipientCount: userIds.length,
      merchantId
    });

    // Create notification records for each user
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title: title,
      message: message,
      type: 'MERCHANT_ANNOUNCEMENT',
      merchant_id: merchantId,
      is_read: false
    }));

    // Insert notifications into user_notifications table
    const { data: createdNotifications, error: notificationError } = await supabase
      .from('user_notifications')
      .insert(notifications)
      .select();

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Here you could integrate with external push notification services like:
    // - Firebase Cloud Messaging (FCM)
    // - Apple Push Notification Service (APNs)  
    // - OneSignal
    // - Pusher
    // For now, we'll use in-app notifications via Supabase realtime

    console.log('Successfully created notifications:', createdNotifications?.length);

    // Also create a merchant notification record for tracking
    await supabase
      .from('merchant_notifications')
      .insert({
        merchant_id: merchantId,
        type: 'NOTIFICATION_SENT',
        payload: {
          title,
          message,
          recipientCount: userIds.length
        },
        is_read: false
      });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          notificationsSent: createdNotifications?.length || 0,
          recipients: userIds.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});