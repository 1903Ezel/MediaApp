export function initOneSignal() {
  return new Promise((resolve) => {
    // Eğer zaten yüklüyse tekrar yükleme
    if (window.OneSignal) {
      resolve(window.OneSignal)
      return
    }

    // OneSignal global tanımı
    window.OneSignal = window.OneSignal || []
    window.OneSignal.push(() => {
      window.OneSignal.init({
        appId: "ONESIGNAL_APP_ID_HERE",  // 🔹 kendi OneSignal App ID'n
        notifyButton: { enable: true },
        allowLocalhostAsSecureOrigin: true, // localhost testleri için
      })
      console.log("🚀 OneSignal SDK yüklendi")
      resolve(window.OneSignal)
    })
  })
}
