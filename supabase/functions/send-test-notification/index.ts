import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  try {
    const { title, body, user_id } = await req.json().catch(() => ({
      title: 'Yeni Mesaj!',
      body: 'Push notification testi!',
    }));

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription');

    if (error) throw new Error(`Query error: ${error.message}`);
    
    console.log(`Found ${subscriptions?.length || 0} subscribers`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No subscribers found'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mock notifications (gerçekte göndermez, sadece simüle eder)
    let mockSent = 0;
    
    for (const sub of subscriptions) {
      const pushSub = sub.subscription;
      if (pushSub?.endpoint) {
        mockSent++;
        console.log(`📱 Mock notification would be sent to: ${pushSub.endpoint.substring(0, 50)}...`);
        console.log(`📝 Title: ${title}, Body: ${body}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `✅ Mock notifications processed successfully!`,
      total_subscribers: subscriptions.length,
      notifications_ready: mockSent,
      note: 'FCM endpoints detected - VAPID authentication needed for real sending',
      request_data: { title, body, user_id }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
});