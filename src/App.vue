<script setup>
import { ref, onMounted, watchEffect } from 'vue'
import { session } from './store.js'
import Auth from './components/Auth.vue'
import Posts from './components/Posts.vue'
import Chat from './components/Chat.vue'
import MenuButton from './components/MenuButton.vue'
import { Film, Image as ImageIcon, Music, MessageSquare, BookText, Home, LogOut, ArrowLeft, Gift } from 'lucide-vue-next'
import { supabase } from './supabaseClient.js'

const activeView = ref('menu')
const currentFilter = ref(null)
const notificationsEnabled = ref(false)
const userLoaded = ref(false)

function navigateTo(viewName, filter = null) {
  currentFilter.value = filter
  activeView.value = viewName
}

function navigateToMenu() {
  activeView.value = 'menu'
  currentFilter.value = null
}

// Doğum günü countdown linklerini aç
function openBirthdayCountdown(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  // Kullanıcı oturumu değiştikçe kontrol et
  watchEffect(() => {
    if (session.value && session.value.user) {
      userLoaded.value = true
    }
  })

  // OneSignal izin durumunu kontrol et (otomatik mod)
  if (window.OneSignalDeferred) {
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        const permission = await OneSignal.Notifications.permission
        notificationsEnabled.value = (permission === "granted")

        // Oturum varsa kullanıcıyı OneSignal ile eşleştir
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await OneSignal.User.PushSubscription.setExternalId(user.id)
          console.log("✅ OneSignal eşleştirildi:", user.id)
        }
      } catch (err) {
        console.warn("OneSignal başlatılırken hata:", err)
      }
    })
  }
})
</script>

<template>
  <div
    class="relative min-h-screen w-full bg-gray-900 bg-fixed bg-cover bg-top"
    style="background-image: url('/app_background.jpg');"
  >
    <div class="absolute inset-0 bg-black/60"></div>

    <div class="relative z-10 min-h-screen w-full flex flex-col items-center py-4 sm:py-8">

      <!-- 🚪 Giriş yapılmadıysa -->
      <div v-if="!session || !session.user" class="flex items-center justify-center h-full">
        <Auth />
      </div>

      <!-- ✅ Giriş yapıldıysa -->
      <div v-else class="w-full max-w-xl mx-auto flex flex-col h-full">
        <header class="mb-8 flex justify-between items-center w-full px-4 sm:px-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-black/50 border border-purple-500/50 flex items-center justify-center shadow-lg">
              <span class="text-white/50 text-xl font-bold">
                {{ session.user.email ? session.user.email.charAt(0).toUpperCase() : '?' }}
              </span>
            </div>
            <span class="text-white/80 font-semibold text-sm hidden sm:block">
              {{ session.user.email || 'Yükleniyor...' }}
            </span>
          </div>

          <div class="flex items-center gap-4">
            <!-- Bildirim durumu göstergesi -->
            <div
              v-if="notificationsEnabled"
              class="flex items-center gap-2 text-green-400 text-sm"
            >
              🔔 Bildirimler aktif
            </div>
            <button
              @click="supabase.auth.signOut()"
              class="flex items-center gap-2 text-sm bg-black/30 text-red-400 hover:text-red-500 p-2 rounded-lg"
            >
              <LogOut :size="16" />
              <span class="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </header>

        <main class="animate-fade-in w-full flex-1 flex flex-col items-center justify-center">
          <div v-if="activeView === 'menu'" class="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <!-- MEVCUT MENÜ BUTONLARI -->
            <MenuButton @click="navigateTo('posts', null)" label="Tüm Akış"><Home :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'text')" label="Notlar"><BookText :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'image')" label="Fotoğraflar"><ImageIcon :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'video')" label="Videolar"><Film :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'audio')" label="Sesler"><Music :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('chat')" label="Anlık Sohbet"><MessageSquare :size="36" class="text-white/80" /></MenuButton>
            
            <!-- YENİ: DOĞUM GÜNÜ COUNTDOWN BUTONLARI -->
            <MenuButton 
              @click="openBirthdayCountdown('https://www.timeanddate.com/countdown/birthday?iso=20251129T19&p0=107&msg=Ezel+Do%C4%9Fumg%C3%BCn%C3%BC&font=cursive')" 
              label="Ezel"
            >
              <Gift :size="36" class="text-pink-400" />
            </MenuButton>
            
            <MenuButton 
              @click="openBirthdayCountdown('https://www.timeanddate.com/countdown/birthday?iso=20251119T17&p0=107&msg=Melik+Do%C4%9Fumg%C3%BCn%C3%BC&font=cursive')" 
              label="Melik"
            >
              <Gift :size="36" class="text-blue-400" />
            </MenuButton>
            
            <MenuButton 
              @click="openBirthdayCountdown('https://www.timeanddate.com/countdown/birthday?iso=20260731T17&p0=805&msg=Nihal+Do%C4%9Fumg%C3%BCn%C3%BC&font=cursive')" 
              label="Nihal"
            >
              <Gift :size="36" class="text-green-400" />
            </MenuButton>
          </div>

          <div v-else class="w-full h-full flex flex-col">
            <button
              @click="navigateToMenu"
              class="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-6 self-start"
            >
              <ArrowLeft :size="16" />
              Ana Menüye Dön
            </button>
            <div class="flex-1">
              <Chat v-if="activeView === 'chat'" :onBack="navigateToMenu" />
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
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>
