// public/sw.js

// Service Worker yüklendiğinde tetiklenir
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker yüklendi');
  // Yeni Service Worker'ın beklemeden hemen aktif olmasını sağlar
  self.skipWaiting();
});

// Service Worker aktif olduğunda tetiklenir
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker aktif');
  // Tüm açık sekmelerin kontrolünü bu Service Worker'a devreder
  event.waitUntil(clients.claim());
});

// 🔔 Sunucudan bir PUSH bildirimi geldiğinde bu olay tetiklenir
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log("Push event'i veri içermiyor.");
    return;
  }

  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png', // Varsayılan ikon
    badge: data.badge || '/icon-192x192.png', // Android için küçük ikon
    vibrate: [200, 100, 200], // Titreşim deseni
    tag: data.data?.id || 'notification', // Aynı ID'li bildirimleri gruplar
    data: data.data, // Bildirime tıklanınca kullanılacak ekstra veri
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 👆 Kullanıcı bir bildirime tıkladığında bu olay tetiklenir
self.addEventListener('notificationclick', (event) => {
  // Bildirimi kapat
  event.notification.close();

  // Uygulamayı aç veya odaktaki sekmeye geç
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Eğer uygulama zaten bir sekmede açıksa, o sekmeye odaklan
        for (let client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Eğer uygulama açık değilse, yeni bir pencerede aç
        if (clients.openWindow) {
          const url = event.notification.data?.url || '/';
          return clients.openWindow(url);
        }
      })
  );
});