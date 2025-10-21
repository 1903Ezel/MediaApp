// public/sw.js

// OneSignal entegrasyonu için CDN'den kendi worker dosyasını içe aktar.
// Bu satır, OneSignal'ın push sistemini senin SW içine dahil eder.
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

// ---------------------------------------------
// 🔹 MediaApp özel işlemleri (cache + custom push)
// ---------------------------------------------

const CACHE_NAME = 'mediaapp-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Service Worker yüklenince
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker yüklendi');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Service Worker aktif olunca
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker aktif');
  event.waitUntil(clients.claim());
});

// Fetch olaylarını yakala ve cache’den yanıtla
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache varsa onu döndür, yoksa ağdan al
      return response || fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});

// 🔔 Custom push olayları (eğer OneSignal dışı bildirim gelirse)
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log("Push event'i veri içermiyor.");
    return;
  }

  const data = event.data.json();
  console.log('📩 Push bildirimi alındı:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.data?.id || 'notification',
    data: data.data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Yeni Bildirim', options)
  );
});

// 🔗 Bildirime tıklanınca
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      }
    })
  );
});
