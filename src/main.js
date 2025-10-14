import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

// 👇 Supabase Client (kendi yoluna göre)
import { supabase } from "./supabaseClient";

// 👇 Vue uygulaması
const app = createApp(App);

/**
 * OneSignal entegrasyonu (v16)
 * - SDK zaten index.html içinde yüklü
 * - Burada sadece kullanıcıyı login ederiz
 */
async function setupOneSignalUser() {
  try {
    // 1️⃣ OneSignal SDK hazır mı kontrol et
    if (!window.OneSignalDeferred) {
      console.error("❌ OneSignal SDK henüz yüklenmedi!");
      return;
    }

    // 2️⃣ Supabase oturum kontrolü
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 3️⃣ Kullanıcı varsa OneSignal'e login et
    if (user) {
      const userId = user.id;

      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          await OneSignal.login(userId);
          console.log("✅ OneSignal user login oldu:", userId);
        } catch (e) {
          console.error("❌ OneSignal login hatası:", e);
        }
      });
    } else {
      console.log("ℹ️ Giriş yapılmamış, OneSignal login atlandı.");
    }
  } catch (err) {
    console.error("❌ OneSignal başlatma hatası:", err);
  }
}

// OneSignal setup başlat
setupOneSignalUser();

// Vue mount
app.mount("#app");
