// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// 🚨🚨 CRITICAL: Supabase Secrets (Ortam Değişkenleri) olarak ayarlanmış değerler
// Bu değişkenler Supabase Dashboard -> Edge Functions -> Variables kısmından ayarlanmalıdır.
const ONE_SIGNAL_APP_ID = Deno.env.get("VITE_ONESIGNAL_APP_ID");
const ONE_SIGNAL_REST_API_KEY = Deno.env.get("VITE_ONESIGNAL_REST_API_KEY");

if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
    throw new Error("OneSignal API anahtarları Edge Function ortam değişkenlerinde ayarlanmadı.");
}

serve(async (req) => {
  try {
    const { sender_id, message_content, sender_username } = await req.json();

    if (!sender_id) {
        return new Response(JSON.stringify({ error: "Sender ID eksik." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Supabase'den sadece bu kullanıcıya ait push aboneliklerini getir
    const supabaseAnonKey = req.headers.get('Authorization')?.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    
    if (!supabaseAnonKey || !supabaseUrl) {
        throw new Error("Supabase URL veya Anon Key (Authorization) eksik.");
    }

    // NOTE: Edge Function içinde Supabase'e erişmek için fetch kullanıyoruz
    const { data: subscriptions, error } = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=subscription&user_id=neq.${sender_id}`, {
        method: 'GET',
        headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
        }
    }).then(res => res.json());

    if (error) throw error;

    const playerIds = subscriptions.map(s => s.subscription);

    if (playerIds.length === 0) {
        return new Response(JSON.stringify({ message: "Hedef abone bulunamadı." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    // YENİ FORMAT: Kullanıcı adı + mesaj içeriği
    const notificationTitle = sender_username || "Yeni Mesaj";
    const notificationBody = message_content || "Yeni bir mesajınız var";

    // OneSignal Bildirim Gönderme Yapılandırması
    const notification = {
        app_id: ONE_SIGNAL_APP_ID,
        include_player_ids: playerIds, 
        contents: {
            en: notificationBody,
            tr: notificationBody,
        },
        headings: {
            en: notificationTitle,
            tr: notificationTitle,
        },
        url: "/", // Ana sayfaya yönlendir
        data: {
            sender_id: sender_id,
            type: "new_message"
        }
    };

    // OneSignal API'ye POST isteği
    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${ONE_SIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(notification),
    });

    const result = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
        console.error("OneSignal API hatası:", result);
        throw new Error(`OneSignal API hatası: ${result.errors?.join(', ')}`);
    }

    return new Response(JSON.stringify({ message: "Bildirim başarıyla gönderildi", result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge Function hatası:", error.message);
    return new Response(JSON.stringify({ error: `Edge Function hatası: ${error.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
