<script setup>
import { ref, onMounted } from 'vue'
import { session } from '../store.js'
import { Bell, BellOff, XCircle } from 'lucide-vue-next'

const permissionStatus = ref('loading') // 'loading', 'default', 'granted', 'denied', 'unsupported'
const isReady = ref(false)

// 🔔 Bildirim izni isteme
async function requestPermission() {
  const user = session.value?.user
  if (!user) {
    alert('Bildirimleri açmak için lütfen giriş yapın.')
    return
  }

  // OneSignal SDK mevcut mu?
  if (!window.OneSignalDeferred) {
    alert('OneSignal SDK yüklenemedi.')
    return
  }

  // OneSignal bildirim izni talebi
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.User.PushSubscription.setExternalId(userId);
      console.log('✅ OneSignal kullanıcı eşleştirildi:', user.id)

      await OneSignal.showSlidedownPrompt()
      const permission = await OneSignal.Notifications.permission

      permissionStatus.value = permission
    } catch (err) {
      console.error('Bildirim izni alınamadı:', err)
      permissionStatus.value = 'denied'
    }
  })
}

onMounted(() => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    permissionStatus.value = 'unsupported'
    return
  }

  // OneSignal hazır olduğunda izin durumunu kontrol et
  if (window.OneSignalDeferred) {
    window.OneSignalDeferred.push(async function (OneSignal) {
      const permission = await OneSignal.Notifications.permission
      permissionStatus.value = permission || 'default'
      isReady.value = true
    })
  } else {
    permissionStatus.value = Notification.permission
  }
})
</script>

<template>
  <div>
    <!-- SDK yükleniyorsa -->
    <div v-if="permissionStatus === 'loading'" class="text-gray-400 text-sm flex items-center gap-2">
      <span class="animate-pulse">Yükleniyor...</span>
    </div>

    <!-- Kullanıcı henüz izin vermediyse -->
    <button
      v-else-if="permissionStatus === 'default'"
      @click="requestPermission"
      class="flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-transform hover:scale-105"
    >
      <Bell :size="16" />
      <span>Bildirimleri Aç</span>
    </button>

    <!-- Bildirimler aktif -->
    <div v-else-if="permissionStatus === 'granted'" class="flex items-center gap-2 text-sm text-green-400">
      <Bell :size="16" />
      <span>Bildirimler Aktif</span>
    </div>

    <!-- Kullanıcı bildirimleri engellediyse -->
    <div v-else-if="permissionStatus === 'denied'" class="flex items-center gap-2 text-sm text-red-400">
      <BellOff :size="16" />
      <span>Bildirimler Engellendi</span>
    </div>

    <!-- Tarayıcı desteklemiyorsa -->
    <div v-else-if="permissionStatus === 'unsupported'" class="flex items-center gap-2 text-sm text-gray-500">
      <XCircle :size="16" />
      <span>Bildirimler Desteklenmiyor</span>
    </div>
  </div>
</template>
