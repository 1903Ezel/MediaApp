// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
console.log("🚀 send-notification function başlatıldı");
// ENVIRONMENT VARIABLES - DOĞRU İSİMLERLE
const ONE_SIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") || Deno.env.get("VITE_ONESIGNAL_APP_ID");
const ONE_SIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_API_KEY") || Deno.env.get("VITE_ONESIGNAL_REST_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SERVICE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
console.log("🔑 Environment Variables Kontrol:");
console.log("- ONESIGNAL_APP_ID:", !!ONE_SIGNAL_APP_ID);
console.log("- ONESIGNAL_API_KEY:", !!ONE_SIGNAL_REST_API_KEY);
console.log("- SUPABASE_URL:", SUPABASE_URL);
console.log("- SERVICE_KEY:", !!SERVICE_KEY);
if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
  throw new Error("OneSignal API anahtarları eksik");
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Supabase URL veya Service Key eksik");
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
serve(async (req)=>{
  console.log("📨 Yeni istek:", req.method);
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const requestBody = await req.json();
    console.log("📦 Request Body:", requestBody);
    const { sender_id, message_content, sender_username } = requestBody;
    if (!sender_id) {
      return new Response(JSON.stringify({
        error: "Sender ID eksik."
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("🔍 Tüm abonelikler getiriliyor...");
    const subscriptionsResponse = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=subscription,user_id&is_active=eq.true`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("📊 API Yanıt Durumu:", subscriptionsResponse.status);
    if (!subscriptionsResponse.ok) {
      const errorText = await subscriptionsResponse.text();
      console.error("❌ Supabase hatası:", errorText);
      throw new Error(`Supabase error: ${subscriptionsResponse.status}`);
    }
    const allSubscriptions = await subscriptionsResponse.json();
    console.log("📋 Tüm abonelikler:", allSubscriptions);
    console.log("🔢 Abonelik sayısı:", allSubscriptions.length);
    // Gönderen hariç tüm abonelikleri filtrele
    const playerIds = allSubscriptions.filter((sub)=>sub.user_id !== sender_id).map((s)=>s.subscription);
    console.log("🎯 Gönderen hariç abonelik sayısı:", playerIds.length);
    console.log("👤 Gönderen ID:", sender_id);
    if (playerIds.length === 0) {
      console.log("ℹ️ Hedef abone bulunamadı");
      return new Response(JSON.stringify({
        message: "Hedef abone bulunamadı."
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // OneSignal bildirimi
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
      contents: {
        en: notificationBody,
        tr: notificationBody
      },
      headings: {
        en: notificationTitle,
        tr: notificationTitle
      },
      url: "/",
      data: {
        sender_id: sender_id,
        type: "new_message"
      }
    };
    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONE_SIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notification)
    });
    const result = await oneSignalResponse.json();
    console.log("✅ OneSignal yanıtı:", result);
    if (!oneSignalResponse.ok) {
      console.error("❌ OneSignal API hatası:", result);
      throw new Error(`OneSignal API hatası: ${result.errors?.join(', ')}`);
    }
    return new Response(JSON.stringify({
      message: "Bildirim başarıyla gönderildi",
      recipients: playerIds.length
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("💥 Edge Function hatası:", error);
    return new Response(JSON.stringify({
      error: `Edge Function hatası: ${error.message}`
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
