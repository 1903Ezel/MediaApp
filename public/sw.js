// ✅ /public/sw.js
// Service Worker – PWA + OneSignal uyumlu versiyon

const CACHE_NAME = "mediaapp-cache-v1";
const OFFLINE_URL = "/offline.html"; // offline.html varsa kullanılır

// 🔹 Yükleme
self.addEventListener("install", (event) => {
  console.log("✅ [SW] Yüklendi");
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]).catch(() => {});
    })
  );
});

// 🔹 Aktif olunca
self.addEventListener("activate", (event) => {
  console.log("✅ [SW] Aktif");
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await clients.claim();
    })()
  );
});

// 🔔 Push bildirimi (eğer OneSignal dışı push varsa)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    console.error("[SW] Push verisi JSON değil:", err);
    return;
  }

  const title = data.title || "Yeni Bildirim";
  const options = {
    body: data.body || "Bir mesajınız var!",
    icon: data.icon || "/icon-192x192.png",
    badge: data.badge || "/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "general",
    data: { url: data.url || "/", ...data.data },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 👆 Bildirime tıklama
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "notification-click", data: event.notification.data });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// 🔇 Bildirim kapatma
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Bildirim kapatıldı:", event.notification.tag);
});

// 🌐 Offline fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((resp) => resp || caches.match(OFFLINE_URL))
    )
  );
});
