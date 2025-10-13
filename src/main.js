import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 👇 ADIM 1: SUPABASE CLIENT'INIZI BURADAN İÇERİ AKTARIYORUZ
// Supabase dosyanızdan 'supabase' değişkenini içeri aktarıyoruz.
// Eğer dosyanızın yolu bu değilse, import yolunu düzenlemeyi unutmayın!
import { supabase } from './supabaseClient'; // Varsayım: src/supabaseClient.js

// ⚠️ ÖNEMLİ: OneSignal eşleştirme mantığı
async function setupOneSignalUser() {
    
    // 1. Supabase'den mevcut oturumu kontrol et
    // Gerçek Supabase oturum kontrolünü kullanıyoruz.
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Kullanıcı oturum açmışsa ve OneSignal yüklenmişse devam et
    if (user && window.OneSignalDeferred) {
        const supabaseUserId = user.id;

        // OneSignal SDK'sının yüklenmesini bekleyin ve eşleştirme yapın
        window.OneSignalDeferred.push(function(OneSignal) {
            
            // KRİTİK EŞLEŞTİRME ADIMI: Supabase ID'si ile OneSignal'ı ilişkilendirir
            OneSignal.setExternalUserId(supabaseUserId);
            console.log("OneSignal: Supabase User ID başarıyla eşleştirildi:", supabaseUserId);
            
            // Eğer isterseniz, kullanıcının cihazına ilk kez izin isteğini gösterin
            // OneSignal.showSlidedownPrompt();
        });
    } else {
        console.log("OneSignal eşleştirmesi atlandı: Kullanıcı oturumu bulunamadı.");
    }
}

// Uygulama başlatılmadan önce (veya hemen sonra) OneSignal kurulumunu başlat
setupOneSignalUser();


// Vue Uygulamasını başlat
createApp(App).mount('#app')
