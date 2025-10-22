<script setup>
import { ref, onMounted, watchEffect } from 'vue'
import { session } from './store.js'
import Auth from './components/Auth.vue'
import Posts from './components/Posts.vue'
import Chat from './components/Chat.vue'
import MenuButton from './components/MenuButton.vue'
import { Film, Image as ImageIcon, Music, MessageSquare, BookText, Home, LogOut, ArrowLeft } from 'lucide-vue-next'
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
