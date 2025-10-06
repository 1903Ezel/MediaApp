/// <reference types="https://deno.land/x/deno/cli/types/d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.6'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

webpush.setVapidDetails(
  'mailto:info@mediaapp.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// 'req' kullanılmadığı için başına '_' ekledik
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

    for (const sub of subscriptions) {
      const pushSubscription = sub.subscription
      const payload = JSON.stringify({
        title: 'MediaApp: Yeni Sohbet Mesajı!',
        body: 'Sohbet odasında yeni bir mesaj var.',
        icon: '/icon-192x192.png'
      })
      
      webpush.sendNotification(pushSubscription, payload).catch(err => console.error("Bildirim gönderilemedi:", err));
    }

    return new Response(JSON.stringify({ message: `${subscriptions.length} aboneye bildirim gönderme işlemi başlatıldı.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) { // GÜNCELLEME: 'error' parametresinden ':any' tipini kaldırdık
    console.error("Fonksiyon Hatası:", error);
    // 'error' objesinin bir Error olduğunu varsayarak .message'a güvenli bir şekilde erişiyoruz
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})