// src/services/notificationService.js
import { supabase } from '../supabaseClient.js' // Supabase istemcisini import et [cite: 2]

class NotificationService {
  constructor() {
    this.oneSignalReady = false;
  }

  // OneSignal'ın yüklenmesini bekleyen mevcut fonksiyonunuz [cite: 4]
  async waitForOneSignal() {
    return new Promise((resolve) => {
      if (this.oneSignalReady && window.OneSignal) return resolve(window.OneSignal);

      const interval = setInterval(() => {
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async (OneSignal) => {
            this.oneSignalReady = true;
            clearInterval(interval);
            resolve(OneSignal);
          });
        }
      }, 300);
    });
  }

  // Kullanıcıdan izin isteyen ve OneSignal ID'yi kaydeden mevcut fonksiyonunuz [cite: 6]
  async requestPermission(userId) {
    if (!userId) {
        console.warn("⚠️ Kullanıcı ID'si olmadan bildirim izni istenemez.");
        return false;
    }
    
    try {
      const OneSignal = await this.waitForOneSignal();

      console.log("🔔 OneSignal başlatılıyor...");
      const permission = await OneSignal.Notifications.requestPermission();

      if (permission !== 'granted') {
        console.warn("❌ Kullanıcı bildirim izni vermedi.");
        return false;
      }

      console.log("✅ Bildirim izni verildi!");

      // 1. OneSignal'a kullanıcı ID'sini set et
      await OneSignal.User.PushSubscription.setExternalId(userId);
      const deviceId = await OneSignal.User.PushSubscription.id;

      if (!deviceId) {
        console.warn("⚠️ Cihaz ID alınamadı, kullanıcı kaydedilmemiş olabilir.");
        return false;
      }

      console.log("📱 OneSignal cihaz ID:", deviceId);
      await this.saveSubscription(userId, deviceId, 'web');

      return true;

    } catch (err) {
      console.error("❌ Push aboneliği hatası:", err);
      return false;
    }
  }

  // OneSignal ID'yi Supabase'e kaydeden mevcut fonksiyonunuz 
  async saveSubscription(userId, playerId, platform) {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    };

    const { error } = await supabase
      .from('push_subscriptions') // Yeni tablo adı ile uyumlu 
      .upsert({
        user_id: userId,
        subscription: playerId,
        platform,
        device_info: deviceInfo,
        is_active: true
      }, {
        onConflict: 'subscription'
      });

    if (error) {
      console.error("Supabase token kaydetme hatası:", error);
      throw error;
    }

    console.log("💾 Supabase push_subscriptions tablosuna kaydedildi.");
  }
}

export default new NotificationService();
