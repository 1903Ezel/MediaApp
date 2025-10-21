// src/main.js
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { supabase } from "./supabaseClient";
import { session } from "./store.js";

const app = createApp(App);

/**
 * ✅ 1️⃣ PWA Service Worker Kaydı
 * Bu, Vercel ortamında hem PWA hem OneSignal ile uyumlu olacak şekilde optimize edilmiştir.
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("✅ Service Worker kayıt edildi:", reg.scope))
      .catch((err) => console.error("❌ Service Worker hatası:", err));
  });
}

/**
 * ✅ 2️⃣ OneSignal Entegrasyonu (v16 uyumlu)
 *  - Kullanıcı login/logout durumuna göre senkronize olur
 *  - SDK yüklenene kadar bekleme eklenmiştir
 */
async function setupOneSignal(userId = null) {
  // SDK yüklenmesini bekle
  for (let i = 0; i < 10; i++) {
    if (window.OneSignalDeferred) break;
    console.log("⏳ OneSignal SDK yükleniyor...");
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!window.OneSignalDeferred) {
    console.error("❌ OneSignal SDK yüklenemedi.");
    return;
  }

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      // OneSignal tamamen init olduktan sonra işlem yap
      await OneSignal.init({
        appId: "6637009c-c223-44f0-8f70-ae3f6a5e3fc4",
        serviceWorkerPath: `${location.origin}/sw.js`,
        serviceWorkerParam: { scope: "/" },
        allowLocalhostAsSecureOrigin: true,
      });

      console.log("✅ OneSignal init tamamlandı.");

      // Mevcut externalId (login sync)
      const currentExternalId = await OneSignal.User.getExternalId?.();

      if (userId && currentExternalId !== userId) {
        await OneSignal.login(userId);
        console.log("🔐 OneSignal login:", userId);
      } else if (!userId && currentExternalId) {
        await OneSignal.logout();
        console.log("👋 OneSignal logout yapıldı.");
      } else {
        console.log("ℹ️ OneSignal zaten güncel:", currentExternalId);
      }
    } catch (err) {
      console.error("❌ OneSignal hata:", err);
    }
  });
}

/**
 * ✅ 3️⃣ Supabase oturum değişimlerini dinle
 */
supabase.auth.onAuthStateChange((event, currentSession) => {
  session.value = currentSession;
  const userId = currentSession?.user?.id || null;
  setupOneSignal(userId);
});

/**
 * ✅ 4️⃣ Başlangıçta mevcut kullanıcıyı kontrol et
 */
(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  setupOneSignal(user?.id || null);
})();

/**
 * ✅ 5️⃣ Vue uygulamasını başlat
 */
app.mount("#app");
