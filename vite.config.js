import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MediaApp - Multimedya Paylaşım Platformu',
        short_name: 'MediaApp',
        description: 'Modern, responsive ve PWA destekli multimedya paylaşım uygulaması.',
        theme_color: '#8b5cf6',
        background_color: '#111827',
        icons: [
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        screenshots: [
          {
            src: 'screenshot-desktop.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Uygulama Ana Ekranı (Masaüstü)'
          },
          {
            src: 'screenshot-mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Uygulama Ana Ekranı (Mobil)'
          }
        ]
      }
    })
  ],

  // 💡 BU KISIM HATAYI ÇÖZÜYOR:
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },

  publicDir: 'public'
})
