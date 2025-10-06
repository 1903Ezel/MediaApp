<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../supabase.js';
import { session } from '../store.js';
import { Bell, BellOff } from 'lucide-vue-next';

const permissionStatus = ref('default');
const isSubscribed = ref(false);
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeUser() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert("Bu tarayıcı anlık bildirimleri desteklemiyor.");
    return;
  }
  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await supabase.from('push_subscriptions').insert({
      user_id: session.value.user.id,
      subscription: subscription,
    });
    
    isSubscribed.value = true;
    permissionStatus.value = 'granted';
    alert("Bildirimlere başarıyla abone olundu!");
  } catch (error) {
    console.error("Abonelik hatası:", error);
    permissionStatus.value = 'denied';
    alert("Bildirim izni alınamadı. Tarayıcı ayarlarınızı kontrol edin.");
  }
}

async function requestNotificationPermission() {
  const permissionResult = await Notification.requestPermission();
  permissionStatus.value = permissionResult;
  if (permissionResult === 'granted') {
    await subscribeUser();
  }
}

onMounted(() => {
  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'push', userVisibleOnly: true }).then(result => {
      permissionStatus.value = result.state;
    });
  } else {
      permissionStatus.value = Notification.permission;
  }
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
  </div>
</template>