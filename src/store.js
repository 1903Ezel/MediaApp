// store.js
import { ref } from 'vue'
import { supabase } from './supabaseClient.js'

export const session = ref(null)

// 🔹 Uygulama açıldığında mevcut oturumu yükle
async function loadInitialSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error("Oturum yüklenirken hata:", error)
  }
  session.value = data?.session || null
}

// 🔹 Oturum değişikliklerini (login, logout, refresh) dinle
supabase.auth.onAuthStateChange((_event, newSession) => {
  session.value = newSession
})

// 🔹 İlk çalıştırmada oturumu yükle
loadInitialSession()
