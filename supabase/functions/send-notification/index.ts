// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

// 🚨 ÖNEMLİ: Bunları Supabase Environment Variables'a (Ayarlar -> Edge Functions -> Secrets) ekleyin.
// OneSignal REST API Key'i ve App ID'niz
const ONE_SIGNAL_API_KEY = Deno.env.get("ONE_SIGNAL_API_KEY");
const ONE_SIGNAL_APP_ID = Deno.env.get("ONE_SIGNAL_APP_ID");

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { sender_id, title, body, url } = await req.json();

    if (!sender_id || !title || !body || !ONE_SIGNAL_API_KEY || !ONE_SIGNAL_APP_ID) {
      return new Response(
        JSON.stringify({ error: "Eksik parametre veya sır (secret) eksik." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Supabase Service Role İstemcisi
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 1. Gönderici Haricindeki Tüm Kullanıcıların OneSignal ID'lerini Al
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription') // OneSignal Player ID
      .eq('is_active', true)
      .neq('user_id', sender_id); // Mesajı gönderen hariç

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log("Bildirim gönderilecek aktif abonelik bulunamadı.");
      return new Response(JSON.stringify({ message: "Abonelik yok." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const playerIds = subscriptions.map(sub => sub.subscription);

    // 2. OneSignal API'sine Bildirim Gönder
    const oneSignalPayload = {
      app_id: ONE_SIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title, tr: title },
      contents: { en: body, tr: body },
      url: url,
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const result = await response.json();
    console.log("OneSignal yanıtı:", result);

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, oneSignalResponse: result }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      throw new Error(`OneSignal API hatası: ${result.errors?.join(', ')}`);
    }

  } catch (error) {
    console.error("Fonksiyon hatası:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
