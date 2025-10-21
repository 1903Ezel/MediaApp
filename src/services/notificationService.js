// src/services/notificationService.js
import { supabase } from '../supabaseClient.js' 

class NotificationService {

  // Sadece OneSignal'ın yüklenmesini bekler, başlatmaya çalışmaz.
  async waitForOneSignal() {
    return new Promise((resolve) => {
      // OneSignalDeferred dizisi var mı kontrol et.
      if (!window.OneSignalDeferred) {
          console.error("❌ OneSignalDeferred bulunamadı. SDK kurulumunu kontrol edin.");
          return resolve(null);
      }
      
      // OneSignalDeferred'a bir callback ekleyerek SDK'nın hazır olmasını bekleriz.
      window.OneSignalDeferred.push(async (OneSignal) => {
          resolve(OneSignal);
      });
    });
  }

  async requestPermission(userId) {
    if (!userId) {
        console.warn("⚠️ Kullanıcı ID'si olmadan bildirim izni istenemez.");
        return false;
    }
    
    try {
      const OneSignal = await this.waitForOneSignal();

      if (!OneSignal) return false;

      console.log("🔔 OneSignal başlatılıyor...");
      
      // İzin durumunu kontrol et
      const permission = await OneSignal.Notifications.requestPermission();

      if (permission !== 'granted') {
        console.warn("❌ Kullanıcı bildirim izni vermedi.");
        return false;
      }

      console.log("✅ Bildirim izni verildi!");

      // 1. OneSignal'a kullanıcı ID'sini set et
      // Bu adım, OneSignal'ın 400 Bad Request hatasını çözmeye yardımcı olabilir.
      await OneSignal.User.addTag("user_id", userId);
      await OneSignal.User.addAlias("external_id", userId); 

      const deviceId = await OneSignal.User.PushSubscription.id;

      if (!deviceId) {
         // Cihaz ID hemen gelmeyebilir, biraz bekleyelim.
         await new Promise(r => setTimeout(r, 1000));
         const tempDeviceId = await OneSignal.User.PushSubscription.id;

         if (!tempDeviceId) {
           console.warn("⚠️ Cihaz ID hala alınamadı, abonelik başarısız.");
           return false;
         }
         
         await this.saveSubscription(userId, tempDeviceId, 'web');
         return true;
      }

      console.log("📱 OneSignal cihaz ID:", deviceId);
      await this.saveSubscription(userId, deviceId, 'web');

      return true;

    } catch (err) {
      console.error("❌ Push aboneliği hatası:", err);
      return false;
    }
  }

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
