import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // 🚨 VERCEL UYUMU İÇİN KRİTİK DÜZELTME:
  // Vercel her zaman kök dizini (/) kullanır.
  // GitHub Pages için olan '/MediaApp/' ayarını siliyoruz.
  base: '/', 

  plugins: [
    vue(),
    VitePWA({ registerType: 'autoUpdate' })
  ],
})
