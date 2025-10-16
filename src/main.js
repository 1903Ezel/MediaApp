import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { supabase } from "./supabaseClient";
import { session } from "./store.js";

const app = createApp(App);

/**
 * 🔔 OneSignal Entegrasyonu (v16 için optimize)
 *  - Kullanıcı login/logout durumuna göre OneSignal senkronize olur.
 *  - Gereksiz 409 Conflict hataları engellenmiştir.
 */
async function setupOneSignal(userId = null) {
  // SDK yüklenmemişse bekle
  if (!window.OneSignalDeferred) {
    console.warn("⚠️ OneSignal SDK henüz yüklenmedi, bekleniyor...");
    return;
  }

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      // ⏳ SDK tamamen hazır olana kadar küçük bekleme
      await new Promise((r) => setTimeout(r, 1000));

      // Mevcut externalId (OneSignal user id)
      const currentExternalId = await OneSignal.User.getExternalId?.();

      // 🔹 Kullanıcı giriş yaptıysa
      if (userId && currentExternalId !== userId) {
        await OneSignal.login(userId);
        console.log("✅ OneSignal login:", userId);
      }
      // 🔹 Kullanıcı çıkış yaptıysa
      else if (!userId && currentExternalId) {
        await OneSignal.logout();
        console.log("👋 OneSignal logout yapıldı.");
      }
      // 🔹 Zaten güncel
      else {
        console.log("ℹ️ OneSignal zaten senkron durumda:", currentExternalId);
      }
    } catch (err) {
      console.error("❌ OneSignal işlem hatası:", err);
    }
  });
}

/**
 * 🧩 Supabase oturum değişimlerini dinle
 */
supabase.auth.onAuthStateChange((event, currentSession) => {
  session.value = currentSession;
  const userId = currentSession?.user?.id || null;
  setupOneSignal(userId);
});

/**
 * 🚀 Başlangıçta mevcut kullanıcıyı kontrol et
 */
(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  setupOneSignal(user?.id || null);
})();

/**
 * 🪄 Vue uygulamasını başlat
 */
app.mount("#app");
