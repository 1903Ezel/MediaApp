import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false // manifest'i public/manifest.webmanifest ile yönetiyoruz
    })
  ],
  build: {
    outDir: 'dist'
  },
  base: '/'
})
