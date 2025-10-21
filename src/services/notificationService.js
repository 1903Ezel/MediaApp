// src/services/notificationService.js - TAM DÜZELTMİŞ
import { supabase } from '../supabaseClient.js' 

class NotificationService {

  // OneSignal'i doğru şekilde bekleyen fonksiyon
  async waitForOneSignal() {
    return new Promise((resolve, reject) => {
      // OneSignal zaten yüklü mü?
      if (window.OneSignal && window.OneSignal.Notifications) {
        console.log("✅ OneSignal zaten hazır");
        return resolve(window.OneSignal);
      }

      // OneSignalDeferred kontrolü
      if (!window.OneSignalDeferred) {
        console.error("❌ OneSignalDeferred bulunamadı. SDK yüklenmemiş.");
        return reject(new Error("OneSignal SDK not loaded"));
      }

      let resolved = false;
      
      // Timeout ekle (10 saniye)
      const timeout = setTimeout(() => {
        if (!resolved) {
          console.error("❌ OneSignal yüklenme timeout");
          reject(new Error("OneSignal load timeout"));
        }
      }, 10000);

      // OneSignalDeferred'a callback ekle
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
        console.warn("⚠️ Kullanıcı ID'si olmadan bildirim izni istenemez.");
        return false;
    }
    
    try {
      console.log("🔔 OneSignal bekleniyor...");
      const OneSignal = await this.waitForOneSignal();
      console.log("✅ OneSignal alındı");

      if (!OneSignal) {
        console.error("❌ OneSignal alınamadı");
        return false;
      }

      console.log("🔔 OneSignal izin kontrolü...");
      
      // İzin durumunu kontrol et
      const currentPermission = await OneSignal.Notifications.permission;
      console.log("📋 Mevcut izin durumu:", currentPermission);

      // DÜZELTME: Eğer zaten izin verilmişse
      if (currentPermission === 'granted') {
        console.log("✅ Zaten izin verilmiş, abonelik oluşturuluyor...");
        const success = await this.saveUserSubscription(userId, OneSignal);
        return success;
      }

      // Yeni izin iste
      console.log("🔔 Yeni izin isteniyor...");
      const newPermission = await OneSignal.Notifications.requestPermission();
      console.log("📋 Yeni izin sonucu:", newPermission);

      // DÜZELTME: Bu satırı değiştirdim - permission kontrolü
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

  // User subscription'ı kaydetmek için ayrı fonksiyon
  async saveUserSubscription(userId, OneSignal) {
    try {
      console.log("📱 Player ID alınıyor...");
      
      // Player ID'yi al
      const pushSubscription = await OneSignal.User.PushSubscription;
      const playerId = await pushSubscription.getId();
      
      console.log("📱 OneSignal Player ID:", playerId);

      if (!playerId) {
        console.warn("⚠️ Player ID alınamadı, 3 saniye bekleniyor...");
        // 3 saniye bekle ve tekrar dene
        await new Promise(r => setTimeout(r, 3000));
        const retryPlayerId = await pushSubscription.getId();
        
        if (!retryPlayerId) {
          console.error("❌ Player ID hala alınamadı");
          return false;
        }
        
        console.log("📱 Player ID (retry):", retryPlayerId);
        await this.saveSubscription(userId, retryPlayerId, 'web');
        return true;
      }

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

    console.log("💾 Supabase'e kaydediliyor:", { userId, playerId });

    const { data, error } = await supabase
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
