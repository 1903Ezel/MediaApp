import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webpush from "https://deno.land/x/web_push@0.1.2/mod.ts";

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

const vapidKeys = {
  publicKey: VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY
};

Deno.serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')

    if (error) throw error;

    const notificationPromises = subscriptions.map(sub => {
      const pushSubscription = sub.subscription as webpush.PushSubscription;
      const payload = JSON.stringify({
        title: 'MediaApp: Yeni Sohbet Mesajı!',
        body: 'Sohbet odasında yeni bir mesaj var.',
        icon: '/icon-192x192.png'
      });
      
      return webpush.sendNotification(pushSubscription, payload, { vapidKeys });
    });

    await Promise.all(notificationPromises);

    return new Response(JSON.stringify({ message: `${subscriptions.length} aboneye bildirim gönderildi.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Fonksiyon Hatası:", error);
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})