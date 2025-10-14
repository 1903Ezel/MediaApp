/**
 * OneSignal Vue3 + Vite Entegrasyonu (v16 SDK için)
 * -------------------------------------------------
 * Bu dosya SDK script'ini dinamik olarak yükler
 * ve Vue app başlatılmadan önce OneSignal'i hazır hale getirir.
 */

export async function initOneSignal() {
  // Eğer SDK zaten yüklüyse yeniden yükleme
  if (window.OneSignalDeferred) {
    console.log("ℹ️ OneSignal zaten yüklü.");
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      // 1️⃣ Script etiketi oluştur
      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.async = true;
      document.head.appendChild(script);

      // 2️⃣ OneSignalDeferred başlat
      window.OneSignalDeferred = window.OneSignalDeferred || [];

      // 3️⃣ SDK yüklenince init et
      window.OneSignalDeferred.push(async function (OneSignal) {
        try {
          await OneSignal.init({
            appId: "6637009c-c223-44f0-8f70-ae3f6a5e3fc4", // 🔥 Senin App ID
            safari_web_id: "", // Eğer Safari kullanmıyorsan boş bırak
            notifyButton: {
              enable: true, // Tarayıcıda sağ altta bildirim ikonu çıkar
            },
            allowLocalhostAsSecureOrigin: true, // Lokal test için izin
          });

          console.log("✅ OneSignal başlatıldı.");
          resolve();
        } catch (err) {
          console.error("❌ OneSignal init hatası:", err);
          reject(err);
        }
      });
    } catch (err) {
      console.error("❌ OneSignal yükleme hatası:", err);
      reject(err);
    }
  });
}
