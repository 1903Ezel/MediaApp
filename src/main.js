import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

// 👇 Supabase Client (kendi dosyana göre yol doğruysa tamam)
import { supabase } from "./supabaseClient";

// 👇 OneSignal plugin'ini çağır
import { initOneSignal } from "./plugins/onesignal"; // ← doğru konumda olduğundan emin ol

// Vue uygulaması
const app = createApp(App);

/**
 * OneSignal entegrasyonu
 * - SDK'yı yükler
 * - Eğer kullanıcı giriş yaptıysa OneSignal'e bağlar
 */
async function setupOneSignalUser() {
  try {
    // 1️⃣ OneSignal SDK yükle ve başlat
    await initOneSignal();

    // 2️⃣ Supabase oturum kontrolü
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 3️⃣ Kullanıcı varsa external_user_id olarak ata
    if (user) {
      const userId = user.id;

      // Yeni SDK v16 standardı: OneSignalDeferred ile çalış
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          await OneSignal.login(userId);
          console.log("✅ OneSignal user login oldu:", userId);
        } catch (e) {
          console.error("❌ OneSignal login hatası:", e);
        }
      });
    } else {
      console.log("ℹ️ Giriş yapılmamış, OneSignal eşleştirmesi atlandı.");
    }
  } catch (err) {
    console.error("❌ OneSignal başlatma hatası:", err);
  }
}

// OneSignal kurulumu başlat
setupOneSignalUser();

// Vue mount
app.mount("#app");
