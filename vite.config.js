javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', 

  plugins: [
    vue(),
    VitePWA({ 
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'MediaApp - Multimedya Platformu',
        short_name: 'MediaApp',
        description: 'Modern, responsive ve PWA destekli multimedya paylaşım uygulaması.',
        theme_color: '#8b5cf6',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        lang: 'tr',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        gcm_sender_id: "482941778795"
      }
    })
  ],
})

