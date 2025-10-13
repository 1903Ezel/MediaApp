import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 👇 Supabase Client (kendi yoluna göre düzenli)
import { supabase } from './supabaseClient'

// 👇 OneSignal SDK'yı yükle (önce index.html'e script eklenecek)
import { initOneSignal } from './onesignal'

// Vue uygulaması
const app = createApp(App)

/**
 * OneSignal entegrasyonu
 * - Kullanıcı oturumu varsa, OneSignal ile eşleştir
 * - Yoksa sadece SDK yüklenir ama kullanıcı ilişkilendirilmez
 */
async function setupOneSignalUser() {
  try {
    // 1️⃣ OneSignal SDK yüklenmesini bekle
    await initOneSignal()

    // 2️⃣ Supabase'den mevcut kullanıcıyı al
    const { data: { user } } = await supabase.auth.getUser()

    // 3️⃣ Kullanıcı varsa, OneSignal external_user_id olarak ayarla
    if (user) {
      const userId = user.id
      window.OneSignal.push(() => {
        window.OneSignal.setExternalUserId(userId)
        console.log("✅ OneSignal eşleştirildi:", userId)
      })
    } else {
      console.log("ℹ️ Giriş yapılmamış, OneSignal eşleştirmesi atlandı.")
    }
  } catch (err) {
    console.error("❌ OneSignal başlatma hatası:", err)
  }
}

// Vue uygulamasını başlatmadan hemen önce OneSignal kur
setupOneSignalUser()

// Vue mount
app.mount('#app')
