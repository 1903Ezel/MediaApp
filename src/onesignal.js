export function initOneSignal() {
  return new Promise((resolve) => {
    if (window.OneSignal) {
      resolve(window.OneSignal);
      return;
    }

    window.OneSignal = window.OneSignal || [];
    window.OneSignal.push(() => {
      window.OneSignal.init({
        appId: "6637009c-c223-44f0-8f70-ae3f6a5e3fc4", // 🔹 kendi OneSignal App ID'n
        notifyButton: { enable: true },
        allowLocalhostAsSecureOrigin: true,
      });
      console.log("✅ OneSignal yüklendi");
      resolve(window.OneSignal);
    });
  });
}
