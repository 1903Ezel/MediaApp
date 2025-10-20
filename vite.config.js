import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // BU SATIR ÇOK ÖNEMLİ: Sitenin doğru yolda yayınlanmasını sağlar.
  // GitHub deponuzun adıyla aynı olmalı.
  base: '/mediaapp/', 
  
  plugins: [
    vue(),
    VitePWA({ registerType: 'autoUpdate' })
  ],
})
