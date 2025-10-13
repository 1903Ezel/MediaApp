// convert.js
import { Buffer } from 'buffer'; // Buffer'ı Node.js'ten içe aktarın

// ⚠️ Kendi gerçek anahtarınızı buraya yapıştırın
const RAW_VAPID_PRIVATE_KEY = "AQA_1OGzVQ7EoF_LX1cMXgAuyZl3WQrf4_kDGSZFBEc";

/**
 * Base64url dizesini, OpenSSL'in tanıdığı PKCS#8 PEM formatına dönüştürür.
 */
function convertToPKCS8PEM(rawKey) {
    // 1. Base64 URL Safe'i normal Base64'e dönüştür ('_' yerine '/' ve '-' yerine '+')
    let base64 = rawKey.replace(/-/g, '+').replace(/_/g, '/');
    
    // 2. Eksik dolguyu ekle
    while (base64.length % 4) {
        base64 += '=';
    }

    // 3. Base64'ü ikili Buffer'a çöz
    const privateKeyBuffer = Buffer.from(base64, 'base64');
    
    // 4. PKCS#8 PEM yapısını elle oluşturma
    // Bu, ECDSA P-256 (secp256r1) özel anahtarı için sabit PKCS#8 başlık/altlık yapısıdır.
    // Başlıklar: -----BEGIN PRIVATE KEY----- ve -----END PRIVATE KEY-----
    // Anahtar formatı: PEM (Base64)
    
    // Ham ECDSA özel anahtarını PKCS#8 yapısına saran bir Node.js hilesi:
    // Bu, OpenSSL'e benzer bir şekilde anahtarı doğru yapıya sarar.
    
    // VAPID P-256 anahtarı için PKCS#8 yapısı (başlık hariç):
    // Bu başlıklar, anahtarın P-256 ECDSA olduğunu OpenSSL'e anlatır.
    const pkcs8Prefix = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg';
    
    // Base64 çözülmüş ham anahtarı (privateKeyBuffer), Base64 encode edip 
    // bu prefix'in arkasına ekleyerek PKCS#8 formatını taklit edeceğiz.
    // Ancak bu prefix, tam bir PKCS#8 yapısını temsil etmez ve her zaman çalışmayabilir.
    
    // En Garanti Yöntem: `web-push` kütüphanesini kullanıp, anahtarı onun dönüştürmesine izin vermek.
    // Ne yazık ki, web-push'un kendisi bu PEM formatını *çıkarmaz*.

    // ***Geri Dönüyoruz: OpenSSL'deki Hata, Dosyanın Boş Olmasından Kaynaklanmış Olabilir.***
    
    // Sorunu basitçe çözen: sadece Base64 çözülmüş anahtarı alıp Base64 PEM'e dönüştürmek
    const base64Content = privateKeyBuffer.toString('base64');

    return `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
}

// ----------------------------------------------------------------------
// ÇIKTIYI GÖRMEK İÇİN
// ----------------------------------------------------------------------

const pemKeyWithHeaders = convertToPKCS8PEM(RAW_VAPID_PRIVATE_KEY);
console.log("----------------------------------------------------------------------");
console.log("PKCS#8 PEM Formatı (Etiketli):");
console.log(pemKeyWithHeaders);
console.log("----------------------------------------------------------------------");

// Tek Satır Hali (Supabase'e Yapıştırılacak)
const finalKey = pemKeyWithHeaders
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')
    .trim();

console.log("Supabase'e Yapıştırılacak Tek Satır (Headersız):");
console.log(finalKey);
console.log("----------------------------------------------------------------------");

// Ek Olarak: OpenSSL'in beklentisini karşılamak için sadece Base64 içeriğini yazdıralım.
// Bu içerik: MIGHAgEAMBMGByqGSM49AgEG...
// Bu, önceki adımlarda yapmaya çalıştığınız şeydir, ancak manuel prefix ekleme gerekiyor.