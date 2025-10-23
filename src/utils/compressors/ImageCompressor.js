// src/utils/compressors/ImageCompressor.js
export class ImageCompressor {
  static async compress(file, options = {}) {
    return new Promise((resolve, reject) => {
      // Validation
      if (!file || !file.type.startsWith('image/')) {
        resolve(file); // Eğer image değilse orijinali döndür
        return;
      }

      const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.7
      } = options;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = function() {
        try {
          let { width, height } = img;

          // Boyut kontrolü - sadece büyükse küçült
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;

          // Çizim
          ctx.drawImage(img, 0, 0, width, height);

          // Sıkıştırma
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                console.log('✅ Compression başarılı!');
                resolve(compressedFile);
              } else {
                console.warn('⚠️ Blob oluşturulamadı, orijinal dosya kullanılıyor');
                resolve(file); // Hata durumunda orijinali döndür
              }
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          console.warn('⚠️ Compression hatası, orijinal dosya kullanılıyor:', error);
          resolve(file); // HATA DURUMUNDA ORİJİNAL DOSYA
        }
      };

      img.onerror = () => {
        console.warn('⚠️ Image yükleme hatası, orijinal dosya kullanılıyor');
        resolve(file); // HATA DURUMUNDA ORİJİNAL DOSYA
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Test fonksiyonu - tarayıcı konsolunda test etmek için
  static async testCompression(file) {
    console.log('🧪 Compression test başlıyor...');
    console.log('Orijinal dosya:', file.name, (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    const compressed = await this.compress(file);
    console.log('Sıkıştırılmış:', compressed.name, (compressed.size / 1024 / 1024).toFixed(2), 'MB');
    
    const savings = ((file.size - compressed.size) / file.size * 100).toFixed(1);
    console.log(`🎉 Tasarruf: ${savings}%`);
    
    return { original: file, compressed, savings };
  }
}
