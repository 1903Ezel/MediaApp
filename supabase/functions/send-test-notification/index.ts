// supabase/functions/send-notification/index.ts

import { createClient } from 'https://esm.sh/@supabase/Bolt Database-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7'; // web-push kütüphanesini ekliyoruz

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

// VAPID anahtarlarını ortam değişkenlerinden alıyoruz
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!; // Public key'i de alalım
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  try {
    const { title, body, user_id, exclude_user_id } = await req.json(); // Gelen veriyi ayrıştır

    // Eğer bir kullanıcı ID'si verilmişse (Chat için), o kullanıcı HARİÇ tüm aboneleri çek.
    // Veya user_id verilmişse sadece o kullanıcıya ait abonelikleri çekebilirsiniz (Örn: Özel Mesaj)
    let query = supabase.from('push_subscriptions').select('subscription, user_id');

    if (exclude_user_id) {
         query = query.neq('user_id', exclude_user_id); // Kendi mesajını kendine bildirme
    } else if (user_id) {
         query = query.eq('user_id', user_id); // Tekil kullanıcıya gönderim
    }

    const { data: subscriptions, error } = await query;

    if (error) throw new Error(`Query error: ${error.message}`);

    const payload = JSON.stringify({
      title: title || 'Yeni Bildirim',
      body: body || 'Bir güncelleme var!',
      data: {
          url: '/', // Bildirime tıklandığında açılacak sayfa
          time: new Date().toISOString()
      }
    });

    const sendPromises = (subscriptions || []).map(sub => {
      try {
        const pushSub = JSON.parse(sub.subscription); // Kayıtlı JSON'u objeye çevir

        // Gerçek gönderim burada yapılıyor!
        return webpush.sendNotification(pushSub, payload)
          .catch(err => {
            console.error(`Gönderim Hatası (Kullanıcı: ${sub.user_id}):`, err);
            // Eğer abonelik sona ermişse, bu aboneliği veritabanından silmek gerekir (UX için önemli)
            if (err.statusCode === 410) { // 410 Gone: Abonelik artık geçersiz
                return supabase.from('push_subscriptions').delete().eq('subscription', sub.subscription);
            }
          });
      } catch (e) {
        console.error('Abonelik JSON parse hatası:', e);
        return null;
      }
    });

    await Promise.allSettled(sendPromises);

    return new Response(JSON.stringify({
      success: true,
      message: `✅ Bildirim gönderimi tamamlandı! Toplam deneme: ${sendPromises.length}`,
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Global Hata:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});