// src/services/notificationService.js
import { supabase } from '../supabase.js'

class NotificationService {
  constructor() {
    this.oneSignalReady = false;
  }

  // 🔧 OneSignal hazır mı kontrol et
  async waitForOneSignal() {
    return new Promise((resolve) => {
      if (this.oneSignalReady) return resolve(window.OneSignal);

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

  // 🔔 OneSignal Üzerinden Push İzni Al
  async requestPermission(userId) {
    try {
      const OneSignal = await this.waitForOneSignal();

      console.log("🔔 OneSignal başlatılıyor...");
      const permission = await OneSignal.Notifications.requestPermission();

      if (permission !== 'granted') {
        console.warn("❌ Kullanıcı bildirim izni vermedi.");
        return false;
      }

      console.log("✅ Bildirim izni verildi!");

      // Kullanıcıyı OneSignal'a kaydet
      await OneSignal.setExternalUserId(userId);
      const deviceId = await OneSignal.User.PushSubscription.id;

      if (!deviceId) {
        console.warn("⚠️ Cihaz ID alınamadı, kullanıcı kaydedilmemiş olabilir.");
        return false;
      }

      console.log("📱 OneSignal cihaz ID:", deviceId);

      // Supabase'e kaydet
      await this.saveSubscription(userId, deviceId, 'web');

      alert("✅ Bildirimlere başarıyla abone olundu!");
      return true;

    } catch (err) {
      console.error("❌ Push aboneliği hatası:", err);
      return false;
    }
  }

  // 💾 Supabase'e kaydet
  async saveSubscription(userId, playerId, platform) {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    };

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: playerId, // OneSignal player ID
        platform: platform,
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
