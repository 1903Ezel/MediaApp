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

// 🔸 push_subscriptions tablosundan aktif kullanıcıları çeker
async function getActiveUserIds(senderId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("is_active", true)
    .neq("user_id", senderId); // Gönderen hariç

  if (error) {
    console.error("❌ Kullanıcı ID'leri alınamadı:", error.message);
    return [];
  }

  const ids = data.map((row) => row.user_id);
  console.log(`🔍 ${ids.length} aktif kullanıcı bulundu.`);
  return ids;
}

// 🔸 OneSignal API'sine bildirim gönderen fonksiyon
async function sendNotification(data: { contents: any; include_external_user_ids: string[] }) {
  if (data.include_external_user_ids.length === 0) {
    console.log("⚠️ Bildirim gönderilecek kullanıcı yok.");
    return { status: 200, message: "No recipients found, skipped." };
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    ...data,
    channel_for_external_user_ids: "push",
    headings: { en: "Yeni Genel Sohbet Mesajı" },
  };

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OneSignal API hatası: ${response.status} - ${errorText}`);
      return { status: 500, message: errorText.substring(0, 120) };
    }

    const result = await response.json();
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

    // 🎯 Eğer recipient_id null ise → genel sohbet bildirimi
    if (recipientId === null) {
      console.log("🟣 Genel sohbet bildirimi başlatıldı...");

      const recipients = await getActiveUserIds(senderId);
      if (recipients.length === 0) {
        return new Response(
          JSON.stringify({ message: "No active users found." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const senderUsername = record.sender?.username || "Anonim Kullanıcı";
      const contents = {
        en: `${senderUsername} yeni bir genel mesaj gönderdi: "${messageContent.substring(0, 50)}..."`,
      };

      const result = await sendNotification({
        contents,
        include_external_user_ids: recipients,
      });

      return new Response(JSON.stringify(result), {
        status: result.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🎯 P2P mesajlaşma (ileride aktif edilebilir)
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
