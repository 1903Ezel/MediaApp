<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase.js';
import { session } from '../store.js';
import { Bell, BellOff, XCircle } from 'lucide-vue-next';

const permissionStatus = ref('loading'); // Başlangıç durumu
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error("VAPID Public Key'i çevirirken hata oluştu:", error);
    return null;
  }
}

async function subscribeUser() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  if (!applicationServerKey) {
      alert("Bildirim yapılandırma hatası: VAPID anahtarı geçersiz.");
      return;
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await supabase.from('push_subscriptions').insert({
      user_id: session.value.user.id,
      subscription: subscription,
    });
    
    permissionStatus.value = 'granted';
    alert("Bildirimlere başarıyla abone olundu!");

  } catch (error) {
    console.error("Abonelik hatası:", error);
    permissionStatus.value = 'denied';
    alert("Bildirim izni alınamadı. Tarayıcı ayarlarınızı veya site izinlerinizi kontrol edin.");
  }
}

async function requestNotificationPermission() {
  if (!vapidPublicKey) {
      alert("Bildirim yapılandırması eksik. Lütfen .env.local dosyasını kontrol edin.");
      return;
  }
  const permissionResult = await Notification.requestPermission();
  permissionStatus.value = permissionResult;
  if (permissionResult === 'granted') {
    await subscribeUser();
  }
}

onMounted(() => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log("Bu tarayıcı anlık bildirimleri desteklemiyor.");
      permissionStatus.value = 'unsupported';
      return;
  }
  permissionStatus.value = Notification.permission;
});
</script>

<template>
  <div>
    <button v-if="permissionStatus === 'default'" @click="requestNotificationPermission"
            class="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg">
      <Bell :size="16" />
      <span>Bildirimleri Aç</span>
    </button>
    
    <div v-else-if="permissionStatus === 'granted'" class="flex items-center gap-2 text-sm text-green-400">
      <Bell :size="16" />
      <span>Bildirimler Aktif</span>
    </div>

    <div v-else-if="permissionStatus === 'denied'" class="flex items-center gap-2 text-sm text-red-400">
      <BellOff :size="16" />
      <span>Bildirimler Engellendi</span>
    </div>

    <div v-else-if="permissionStatus === 'unsupported'" class="flex items-center gap-2 text-sm text-gray-500">
      <XCircle :size="16" />
      <span>Desteklenmiyor</span>
    </div>
  </div>
</template>