<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase.js'

const loading = ref(false)
const email = ref('')
const password = ref('')
const isRegistering = ref(false) // Kayıt modu açık mı?

const handleAuth = async () => {
  try {
    loading.value = true
    let authFunction;
    let successMessage;

    if (isRegistering.value) {
      // Kayıt Olma (Sign Up)
      authFunction = supabase.auth.signUp
      successMessage = 'Hesap başarıyla oluşturuldu! Lütfen giriş yapın.'
    } else {
      // Giriş Yapma (Sign In)
      authFunction = supabase.auth.signInWithPassword
      successMessage = 'Giriş başarılı! Yönlendiriliyorsunuz...'
    }

    const { error } = await authFunction({
      email: email.value,
      password: password.value,
      // 🚨 KRİTİK DÜZELTME: Kayıt olurken flowType ekleniyor
      // Bu, "Cannot read properties of undefined (reading 'flowType')" hatasını çözer.
      // PKCE (Proof Key for Code Exchange) akışını kullanır.
      ...(isRegistering.value && { options: { flowType: 'pkce' } }) 
    })

    if (error) throw error
    alert(successMessage)

  } catch (error) {
    // 400 hatası genellikle şifre zayıflığından veya kullanıcının zaten var olmasından kaynaklanır.
    alert(error.error_description || error.message)
  } finally {
    loading.value = false
  }
}

// Supabase'de E-posta/Şifre sağlayıcısının açık olduğundan emin olun!
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-8 bg-black/30 rounded-2xl w-full max-w-sm shadow-2xl">
    <h1 class="text-3xl font-extrabold text-white">{{ isRegistering ? 'Kayıt Ol' : 'MediaApp Giriş' }}</h1>
    <p class="text-white/70">Devam etmek için e-posta ve şifrenizi kullanın.</p>
    
    <form @submit.prevent="handleAuth" class="w-full flex flex-col gap-4">
      <!-- E-posta Alanı -->
      <input
        v-model="email"
        type="email"
        placeholder="E-posta adresiniz"
        class="px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-purple-500 transition-all"
        required
      />
      
      <!-- Şifre Alanı -->
      <input
        v-model="password"
        type="password"
        placeholder="Şifreniz"
        minlength="6"
        class="px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-purple-500 transition-all"
        required
      />

      <button
        type="submit"
        class="px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:bg-gray-500 shadow-md hover:shadow-lg"
        :disabled="loading"
      >
        {{ loading ? 'İşleniyor...' : (isRegistering ? 'Kaydol' : 'Giriş Yap') }}
      </button>
    </form>
    
    <!-- Mod Değiştirme Butonu -->
    <button
      @click="isRegistering = !isRegistering"
      class="text-sm text-purple-400 hover:text-purple-300 transition-colors mt-2"
    >
      {{ isRegistering ? 'Zaten hesabım var. Giriş Yap' : 'Hesabın yok mu? Kaydol' }}
    </button>
  </div>
</template>
