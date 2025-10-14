<script setup>
import { ref, onMounted } from 'vue'
import { session } from './store.js'
import Auth from './components/Auth.vue'
import Posts from './components/Posts.vue'
import Chat from './components/Chat.vue'
import MenuButton from './components/MenuButton.vue'
import { Film, Image as ImageIcon, Music, MessageSquare, BookText, Home, LogOut, BellRing, ArrowLeft } from 'lucide-vue-next'
import { supabase } from './supabaseClient.js'

const activeView = ref('menu')
const currentFilter = ref(null)
const notificationsEnabled = ref(false) // ⚡ Bildirim durumu

function navigateTo(viewName, filter = null) {
  currentFilter.value = filter
  activeView.value = viewName
}

function navigateToMenu() {
  activeView.value = 'menu'
  currentFilter.value = null
}

// ⚡ OneSignal izin isteme ve eşleştirme
async function enableNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert("Lütfen önce giriş yapın.")
      return
    }

    // SDK yüklenmiş mi kontrol et
    if (!window.OneSignalDeferred) {
      alert("OneSignal SDK yüklenemedi.")
      return
    }

    // SDK'ya kullanıcıyı tanıt ve izni iste
    window.OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.setExternalUserId(user.id)
      console.log("✅ OneSignal eşleştirildi:", user.id)

      // Slidedown prompt göster
      await OneSignal.showSlidedownPrompt()

      notificationsEnabled.value = true
    })
  } catch (err) {
    console.error("Bildirim izni verilirken hata:", err)
  }
}

onMounted(() => {
  // ⚡ Kullanıcı zaten izin vermiş mi kontrol et
  if (window.OneSignalDeferred) {
    window.OneSignalDeferred.push(async function(OneSignal) {
      const permission = await OneSignal.Notifications.permission
      if (permission === "granted") {
        notificationsEnabled.value = true
      }
    })
  }
})
</script>

<template>
  <div class="relative min-h-screen w-full bg-gray-900 bg-fixed bg-cover bg-top" 
       style="background-image: url('/app_background.jpg');">
    
    <div class="absolute inset-0 bg-black/60"></div>

    <div class="relative z-10 min-h-screen w-full flex flex-col items-center py-4 sm:py-8">

      <div v-if="!session" class="flex items-center justify-center h-full">
        <Auth />
      </div>

      <div v-else class="w-full max-w-xl mx-auto flex flex-col h-full">
        <header class="mb-8 flex justify-between items-center w-full px-4 sm:px-0">
          <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-black/50 border border-purple-500/50 flex items-center justify-center shadow-lg">
                  <span class="text-white/50 text-xl font-bold">{{ session.user.email.charAt(0).toUpperCase() }}</span>
              </div>
              <span class="text-white/80 font-semibold text-sm hidden sm:block">{{ session.user.email }}</span>
          </div>
          
          <!-- ⚡ Bildirim ve Çıkış butonlarını bir arada grupladık -->
          <div class="flex items-center gap-4">
            <!-- Bildirim Butonu -->
            <button
              @click="enableNotifications"
              class="flex items-center gap-2 text-sm px-3 py-2 rounded-lg shadow-md transition-colors"
              :class="notificationsEnabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-purple-600 text-white hover:bg-purple-700'"
            >
              <BellRing :size="16"/>
              <span>{{ notificationsEnabled ? 'Bildirimler Açık' : 'Bildirimleri Aç' }}</span>
            </button>

            <!-- Çıkış Butonu -->
            <button 
              @click="supabase.auth.signOut()" 
              class="flex items-center gap-2 text-sm bg-black/30 text-red-400 hover:text-red-500 p-2 rounded-lg"
            >
              <LogOut :size="16"/>
              <span class="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </header>

        <main class="animate-fade-in w-full flex-1 flex flex-col items-center justify-center">
          <div v-if="activeView === 'menu'" class="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <MenuButton @click="navigateTo('posts', null)" label="Tüm Akış"><Home :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'text')" label="Notlar"><BookText :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'image')" label="Fotoğraflar"><ImageIcon :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'video')" label="Videolar"><Film :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'audio')" label="Sesler"><Music :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('chat')" label="Anlık Sohbet"><MessageSquare :size="36" class="text-white/80" /></MenuButton>
          </div>

          <div v-else class="w-full h-full flex flex-col">
            <button @click="navigateToMenu" class="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-6 self-start">
              <ArrowLeft :size="16" />
              Ana Menüye Dön
            </button>
            <div class="flex-1">
                <Chat v-if="activeView === 'chat'" />
                <Posts v-if="activeView === 'posts'" :filter="currentFilter" />
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>
