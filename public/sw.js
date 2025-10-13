// ✅ /public/sw.js

// 🔹 Service Worker yüklenince
self.addEventListener('install', (event) => {
  console.log('✅ [SW] Yüklendi');
  self.skipWaiting(); // Yeni SW hemen aktif olsun
});

// 🔹 Aktif olduğunda
self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Aktif');
  event.waitUntil(clients.claim());
});

// 🔔 PUSH bildirim geldiğinde
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn("[SW] Push olayı veri içermiyor.");
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    console.error("[SW] Push verisi JSON formatında değil:", err);
    return;
  }

  const title = data.title || 'Yeni Bildirim';
  const options = {
    body: data.body || 'Bir mesajınız var!',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'general',
    data: {
      url: data.url || '/', // Bildirime tıklanınca açılacak sayfa
      ...data.data
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 👆 Kullanıcı bildirime tıklarsa
self.addEventListener('notificationclick', (event) => {
  console.log("[SW] Bildirime tıklandı");
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let client of clientList) {
          // Eğer uygulama zaten açık bir sekmede ise, o sekmeye odaklan
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({ type: 'notification-click', data: event.notification.data });
            return;
          }
        }
        // Eğer açık sekme yoksa yeni sekme aç
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// 🔇 (Opsiyonel) Bildirim kapatıldığında loglayabilirsin
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Bildirim kapatıldı:', event.notification.tag);
});
