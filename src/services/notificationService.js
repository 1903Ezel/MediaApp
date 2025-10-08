// src/services/notificationService.js
import { supabase } from '../supabase.js'

class NotificationService {
  constructor() {
    this.registration = null
  }

  // 🔔 Web Push İzni Al ve Token Kaydet
  async requestPermission(userId) {
    if (!('Notification' in window)) {
      console.warn('Bu tarayıcı bildirimleri desteklemiyor')
      return false
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker desteklenmiyor')
      return false
    }

    try {
      // 1. İzin iste
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('Bildirim izni reddedildi')
        return false
      }

      // 2. Service Worker'ı kaydet
      this.registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // 3. Push subscription (abonelik) oluştur
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        )
      })

      // 4. Supabase'e kaydet
      await this.saveToken(userId, JSON.stringify(subscription), 'web')

      console.log('✅ Push bildirimleri aktif!')
      alert("Bildirimlere başarıyla abone olundu!");
      return true

    } catch (error) {
      console.error('Push bildirim hatası:', error)
      return false
    }
  }

  // 💾 Token'ı Veritabanına Kaydet
  async saveToken(userId, token, platform) {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    }

    // 'upsert' komutu sayesinde, eğer aynı token zaten varsa üzerine yazar, yoksa yeni kayıt oluşturur.
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: platform,
        device_info: deviceInfo,
        is_active: true
      }, {
        onConflict: 'token' // Eğer aynı 'token' varsa, çakışmayı bu sütuna göre çöz
      })

    if (error) {
      console.error('Token kaydetme hatası:', error)
      throw error
    }
  }

  // 🔧 Helper: VAPID Public Key'i doğru formata çeviren fonksiyon
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

// Bu servisin tek bir örneğini oluşturup dışarıya aktarıyoruz
export default new NotificationService()