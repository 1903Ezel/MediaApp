import { serve } from "https://deno.land/std@0.176.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

console.log("📡 Edge Function send-notification başlatıldı");

// 🔹 OneSignal ortam değişkenleri
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");

if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
  throw new Error("❌ ONESIGNAL_APP_ID veya ONESIGNAL_API_KEY Supabase Secrets'ta tanımlı değil.");
}

// 🔹 Supabase istemcisi
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// 🔸 push_subscriptions tablosundan aktif kullanıcıların endpointlerini çeker
async function getActiveEndpoints(senderId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("subscription, user_id")
    .eq("is_active", true)
    .neq("user_id", senderId); // Gönderen hariç

  if (error) {
    console.error("❌ push_subscriptions tablosu okunamadı:", error.message);
    return [];
  }

  // JSON içinden endpoint'i çıkart
  const endpoints = data
    .map((row) => {
      try {
        const sub = JSON.parse(row.subscription);
        return sub.endpoint as string;
      } catch {
        return null;
      }
    })
    .filter((e): e is string => !!e);

  console.log(`🔍 ${endpoints.length} aktif endpoint bulundu.`);
  return endpoints;
}

// 🔸 OneSignal API'sine bildirim gönderir
async function sendNotification(endpoints: string[], message: string, senderUsername: string) {
  if (endpoints.length === 0) {
    console.log("⚠️ Bildirim gönderilecek abone yok.");
    return { status: 200, message: "No recipients found, skipped." };
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_external_user_ids: endpoints, // 🔹 burada endpoint'leri kullanıyoruz
    channel_for_external_user_ids: "push",
    headings: { en: "Yeni Genel Sohbet Mesajı" },
    contents: {
      en: `${senderUsername} yeni bir genel mesaj gönderdi: "${message.substring(0, 50)}..."`,
    },
  };

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`❌ OneSignal API hatası: ${res.status} - ${txt}`);
      return { status: 500, message: txt.substring(0, 200) };
    }

    const result = await res.json();
    console.log("✅ Bildirim başarıyla gönderildi:", result.id);
    return { status: 200, message: "Notification sent successfully" };
  } catch (e) {
    console.error("❌ OneSignal isteği başarısız:", e.message);
    return { status: 500, message: e.message };
  }
}

// 🔸 Ana handler
serve(async (req) => {
  try {
    const { record } = await req.json();

    if (!record) {
      return new Response(
        JSON.stringify({ message: "Invalid payload: 'record' missing." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const senderId = record.sender_id;
    const recipientId = record.recipient_id;
    const messageContent = record.content;
    const senderUsername = record.sender?.username || "Anonim Kullanıcı";

    // 🎯 Genel sohbet bildirimi
    if (recipientId === null) {
      console.log("🟣 Genel sohbet bildirimi başlatıldı...");

      const endpoints = await getActiveEndpoints(senderId);
      const result = await sendNotification(endpoints, messageContent, senderUsername);

      return new Response(JSON.stringify(result), {
        status: result.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🎯 P2P mesajlaşma (şimdilik pasif)
    console.log(`🟡 Birebir mesaj tespit edildi, recipient_id: ${recipientId}`);
    return new Response(
      JSON.stringify({ message: "P2P logic skipped (genel chat only)" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("❌ Edge Function genel hata:", e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
