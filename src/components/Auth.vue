<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase.js'

const loading = ref(false)
const email = ref('')

const handleLogin = async () => {
  try {
    loading.value = true
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
    })
    if (error) throw error
    alert('Giriş linki için e-postanızı kontrol edin!')
  } catch (error) {
    alert(error.error_description || error.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-8 bg-black/30 rounded-2xl w-full max-w-sm">
    <h1 class="text-2xl font-bold text-white">MediaApp</h1>
    <p class="text-white/70">Devam etmek için e-postanızla giriş yapın</p>
    <form @submit.prevent="handleLogin" class="w-full flex flex-col gap-4">
      <input
        v-model="email"
        type="email"
        placeholder="E-posta adresiniz"
        class="px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-purple-500"
        required
      />
      <button
        type="submit"
        class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:bg-gray-500"
        :disabled="loading"
      >
        {{ loading ? 'Gönderiliyor...' : 'Giriş Linki Gönder' }}
      </button>
    </form>
  </div>
</template>