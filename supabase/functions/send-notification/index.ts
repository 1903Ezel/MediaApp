// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

console.log("🚀 send-notification function başlatıldı");

const ONE_SIGNAL_APP_ID = Deno.env.get("VITE_ONESIGNAL_APP_ID");
const ONE_SIGNAL_REST_API_KEY = Deno.env.get("VITE_ONESIGNAL_REST_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY"); // YENİ: Anon Key environment variable

console.log("🔑 Environment Variables:", {
  hasAppId: !!ONE_SIGNAL_APP_ID,
  hasApiKey: !!ONE_SIGNAL_REST_API_KEY,
  hasSupabaseUrl: !!SUPABASE_URL,
  hasAnonKey: !!SUPABASE_ANON_KEY
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log("📨 Yeni istek geldi:", req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log("📦 Request Body:", requestBody);

    // YENİ FORMAT parametreleri
    const { sender_id, message_content, sender_username } = requestBody;

    if (!sender_id) {
      console.error("❌ Sender ID eksik");
      return new Response(JSON.stringify({ error: "Sender ID eksik." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // YENİ: Environment variable'dan anon key al
    const supabaseAnonKey = SUPABASE_ANON_KEY;
    console.log("🔐 Anon Key kullanılıyor:", !!supabaseAnonKey);

    if (!supabaseAnonKey || !SUPABASE_URL) {
      console.error("❌ Supabase bilgileri eksik");
      throw new Error("Supabase URL veya Anon Key eksik.");
    }

    // Supabase'den abonelikleri getir
    console.log("🔍 Abonelikler getiriliyor...");
    const subscriptionsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=subscription&user_id=neq.${sender_id}`, 
      {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!subscriptionsResponse.ok) {
      const errorText = await subscriptionsResponse.text();
      console.error("❌ Supabase abonelik hatası:", errorText);
      throw new Error(`Supabase error: ${subscriptionsResponse.status}`);
    }

    const subscriptions = await subscriptionsResponse.json();
    console.log("📋 Bulunan abonelikler:", subscriptions?.length || 0);

    const playerIds = subscriptions?.map(s => s.subscription) || [];

    if (playerIds.length === 0) {
      console.log("ℹ️ Hedef abone bulunamadı");
      return new Response(JSON.stringify({ message: "Hedef abone bulunamadı." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OneSignal bildirimi - YENİ FORMAT
    const notificationTitle = sender_username || "Yeni Mesaj";
    const notificationBody = message_content || "Yeni bir mesajınız var";

    console.log("📢 OneSignal bildirimi:", {
      title: notificationTitle,
      body: notificationBody,
      playerCount: playerIds.length
    });

    const notification = {
      app_id: ONE_SIGNAL_APP_ID,
      include_player_ids: playerIds,
      contents: { en: notificationBody, tr: notificationBody },
      headings: { en: notificationTitle, tr: notificationTitle },
      url: "/",
      data: { sender_id: sender_id, type: "new_message" }
    };

    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONE_SIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await oneSignalResponse.json();
    console.log("✅ OneSignal yanıtı:", result);

    if (!oneSignalResponse.ok) {
      console.error("❌ OneSignal API hatası:", result);
      throw new Error(`OneSignal API hatası: ${result.errors?.join(', ')}`);
    }

    return new Response(JSON.stringify({ 
      message: "Bildirim başarıyla gönderildi"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("💥 Edge Function hatası:", error);
    return new Response(JSON.stringify({ 
      error: `Edge Function hatası: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
