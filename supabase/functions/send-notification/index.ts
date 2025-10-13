// supabase/functions/send-notification/index.ts

// 🔹 Supabase ve JWT oluşturma için gerekli Deno modüllerini kullanıyoruz.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create as createJwt, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// 🔹 Supabase istemcisi
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// 🔹 VAPID ortam değişkenleri
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")!;

// 🔹 VAPID detayları
const vapidDetails = {
  subject: VAPID_SUBJECT || "mailto:default@example.com",
  publicKey: VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY,
};

// ✅ Tüm formatları (PEM, Base64, Base64URL) destekleyen VAPID key dönüştürücü
async function getVapidKey(privateKeyInput: string): Promise<CryptoKey> {
  try {
    // 1️⃣ PEM başlık/son ve boşlukları temizle
    let key = privateKeyInput
      .replace(/-----.*PRIVATE KEY-----/g, "")
      .replace(/\s+/g, "");

    // 2️⃣ Normal Base64'ü Base64URL'e dönüştür
    key = key.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    // 3️⃣ Base64URL çöz
    const base64 = key.replace(/-/g, "+").replace(/_/g, "/");
    const binaryKey = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // 4️⃣ PKCS#8 içe aktar (ECDSA P-256)
    return await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
  } catch (e) {
    console.error("VAPID anahtar içe aktarma başarısız:", e.message);
    throw new Error("Kritik VAPID Anahtar Hatası: " + e.message);
  }
}

// ✅ Bildirim gönderme fonksiyonu
async function sendPushNotification(pushSub: any, payload: string, vapidKey: CryptoKey) {
  const subscriptionData = JSON.parse(pushSub.subscription);
  const endpoint = subscriptionData.endpoint;

  // JWT için 1 saatlik geçerlilik
  const expiration = getNumericDate(3600);

  const jwtPayload = {
    aud: new URL(endpoint).origin,
    exp: expiration,
    sub: vapidDetails.subject,
  };

  const jwtHeader = {
    alg: "ES256" as const,
    typ: "JWT",
  };

  // JWT imzası
  const authToken = await createJwt(jwtHeader, jwtPayload, vapidKey);

  // Başlıklar
  const headers = {
    "Content-Type": "application/octet-stream",
    "Content-Length": new TextEncoder().encode(payload).length.toString(),
    TTL: "600",
    Authorization: `WebPush ${authToken}`,
    "Crypto-Key": `p256dh=${vapidDetails.publicKey}`,
  };

  // Bildirimi gönder
  const response = await fetch(endpoint, {
    method: "POST",
    headers: headers,
    body: payload,
  });

  if (response.status === 410) {
    throw { statusCode: 410, message: "Abonelik Geçersiz (410 Gone)" };
  }

  if (response.status < 200 || response.status >= 300) {
    const errorBody = await response.text();
    throw {
      statusCode: response.status,
      message: `Push servisi hata döndürdü: ${response.status} - ${errorBody}`,
    };
  }

  return true;
}

// ✅ HTTP isteğini işleyen ana handler
Deno.serve(async (req) => {
  try {
    const requestBody = await req.json();
    const { record } = requestBody;

    // Ortam değişkenleri kontrolü
    if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || !VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      throw new Error("Kritik ortam değişkenleri tanımlı değil.");
    }

    // VAPID özel anahtarını dönüştür
    const vapidKey = await getVapidKey(VAPID_PRIVATE_KEY);

    const title = "Yeni Mesaj 💬";
    const body = `(${record.sender_id.substring(0, 4)}...): ${record.content}`;
    const exclude_user_id = record.sender_id;

    // Abonelikleri çek (kendisi hariç)
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("subscription, user_id")
      .neq("user_id", exclude_user_id);

    if (error) throw new Error(`Veritabanı hatası: ${error.message}`);

    // Bildirim payload
    const payload = JSON.stringify({
      title,
      body,
      data: { url: "/chat", time: new Date().toISOString() },
    });

    const sendPromises = (subscriptions || []).map(async (sub) => {
      try {
        await sendPushNotification(sub, payload, vapidKey);
        console.log(`✅ Bildirim gönderildi: Kullanıcı ${sub.user_id}`);
      } catch (err: any) {
        console.error(`🚫 Gönderim Hatası (Kullanıcı: ${sub.user_id}):`, err.message);

        // 410 (geçersiz abonelik) ise sil
        if (err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("subscription", sub.subscription);
          console.log(`🗑 Geçersiz abonelik silindi: ${sub.user_id}`);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bildirim gönderimi tamamlandı (${sendPromises.length} deneme).`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Global Hata:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
