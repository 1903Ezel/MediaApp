// src/services/notificationService.js - TAM DÜZELTMİŞ
import { supabase } from '../supabaseClient.js' 

class NotificationService {

  async waitForOneSignal() {
    return new Promise((resolve, reject) => {
      if (window.OneSignal && window.OneSignal.Notifications) {
        console.log("✅ OneSignal zaten hazır");
        return resolve(window.OneSignal);
      }

      if (!window.OneSignalDeferred) {
        console.error("❌ OneSignalDeferred bulunamadı");
        return reject(new Error("OneSignal SDK not loaded"));
      }

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.error("❌ OneSignal yüklenme timeout");
          reject(new Error("OneSignal load timeout"));
        }
      }, 10000);

      window.OneSignalDeferred.push(async (OneSignal) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.log("✅ OneSignal hazır");
          resolve(OneSignal);
        }
      });
    });
  }

  async requestPermission(userId) {
    if (!userId) {
      console.warn("⚠️ Kullanıcı ID'si yok");
      return false;
    }
    
    try {
      console.log("🔔 OneSignal bekleniyor...");
      const OneSignal = await this.waitForOneSignal();
      
      console.log("🔔 OneSignal izin kontrolü...");
      const currentPermission = await OneSignal.Notifications.permission;
      console.log("📋 Mevcut izin durumu:", currentPermission);

      // DÜZELTME: İzin TRUE ise devam et
      if (currentPermission === 'granted') {
        console.log("✅ Zaten izin verilmiş, abonelik oluşturuluyor...");
        const success = await this.saveUserSubscription(userId, OneSignal);
        return success;
      }

      // Yeni izin iste
      console.log("🔔 Yeni izin isteniyor...");
      const newPermission = await OneSignal.Notifications.requestPermission();
      console.log("📋 Yeni izin sonucu:", newPermission);

      // DÜZELTME: Bu satır kritik - permission kontrolü
      if (newPermission === 'granted') {
        console.log("✅ Yeni bildirim izni verildi!");
        const success = await this.saveUserSubscription(userId, OneSignal);
        return success;
      } else {
        console.warn("❌ Kullanıcı bildirim izni vermedi.");
        return false;
      }

    } catch (err) {
      console.error("❌ Push aboneliği hatası:", err);
      return false;
    }
  }

  async saveUserSubscription(userId, OneSignal) {
    try {
      console.log("📱 Player ID alınıyor...");
      
      // DÜZELTME: Yeni OneSignal API
      const pushSubscription = OneSignal.User.PushSubscription;
      const playerId = pushSubscription.id; // .getId() DEĞİL, .id
      
      console.log("📱 OneSignal Player ID:", playerId);

      if (!playerId) {
        console.warn("⚠️ Player ID alınamadı");
        return false;
      }

      // Database'e kaydet
      await this.saveSubscription(userId, playerId, 'web');
      return true;

    } catch (error) {
      console.error("❌ Subscription kaydetme hatası:", error);
      return false;
    }
  }

  async saveSubscription(userId, playerId, platform) {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    };

    console.log("💾 Supabase'e kaydediliyor:", playerId);

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
      console.error("❌ Supabase kayıt hatası:", error);
      throw error;
    }

    console.log("✅ Supabase'e başarıyla kaydedildi:", playerId);
    return true;
  }
}

export default new NotificationService();
