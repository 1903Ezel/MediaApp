<script setup>
import { ref, onMounted } from 'vue';
import notificationService from '../services/notificationService.js'; // Az önce oluşturduğumuz servisi import ediyoruz
import { session } from '../store.js';
import { Bell, BellOff, XCircle } from 'lucide-vue-next';

const permissionStatus = ref('loading'); // 'loading', 'default', 'granted', 'denied', 'unsupported'

async function requestPermission() {
  if (!session.value?.user?.id) {
    alert("Bildirimlere abone olmak için önce giriş yapmalısınız.");
    return;
  }
  const granted = await notificationService.requestPermission(session.value.user.id);
  permissionStatus.value = granted ? 'granted' : 'denied';
}

onMounted(() => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    permissionStatus.value = 'unsupported';
    return;
  }
  permissionStatus.value = Notification.permission;
});
</script>

<template>
  <div>
    <button v-if="permissionStatus === 'default'" @click="requestPermission"
            class="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-transform hover:scale-105">
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