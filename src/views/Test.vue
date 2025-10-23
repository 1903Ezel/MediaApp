<!-- src/views/Test.vue -->
<template>
  <div class="test-page">
    <div class="test-header">
      <h1>🧪 Medya Sıkıştırma Testi</h1>
      <p>Bu sayfa sadece test içindir. İşlem bitince kaldırılacak.</p>
    </div>

    <div class="test-container">
      <!-- COMPRESSION TEST -->
      <div class="test-section">
        <h3>🖼️ Resim Sıkıştırma Testi</h3>
        
        <div class="upload-area">
          <input 
            type="file" 
            id="compressionTest" 
            accept="image/*" 
            @change="runCompressionTest"
            class="file-input"
          >
          <label for="compressionTest" class="upload-label">
            📸 Resim Seç ve Test Et
          </label>
        </div>

        <!-- RESULTS -->
        <div v-if="testResult" class="results">
          <div class="result-card success">
            <h4>✅ Test Tamamlandı!</h4>
            <div class="stats">
              <div class="stat">
                <span class="label">Orijinal Boyut:</span>
                <span class="value">{{ formatSize(testResult.original.size) }}</span>
              </div>
              <div class="stat">
                <span class="label">Sıkıştırılmış:</span>
                <span class="value">{{ formatSize(testResult.compressed.size) }}</span>
              </div>
              <div class="stat highlight">
                <span class="label">Tasarruf:</span>
                <span class="value">{{ testResult.savings }}% 🎉</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PREVIEW -->
        <div v-if="testResult" class="preview">
          <div class="preview-item">
            <h5>Orijinal</h5>
            <img :src="testResult.original.url" class="preview-img">
            <small>{{ formatSize(testResult.original.size) }}</small>
          </div>
          <div class="preview-item">
            <h5>Sıkıştırılmış</h5>
            <img :src="testResult.compressed.url" class="preview-img">
            <small>{{ formatSize(testResult.compressed.size) }}</small>
          </div>
        </div>
      </div>

      <!-- COMPRESSION SETTINGS -->
      <div class="test-section">
        <h3>⚙️ Ayarlar</h3>
        <div class="settings">
          <label class="setting-item">
            <span>Maksimum Genişlik:</span>
            <input type="number" v-model.number="settings.maxWidth" min="100" max="4000">
            px
          </label>
          <label class="setting-item">
            <span>Maksimum Yükseklik:</span>
            <input type="number" v-model.number="settings.maxHeight" min="100" max="4000">
            px
          </label>
          <label class="setting-item">
            <span>Kalite:</span>
            <input type="range" v-model.number="settings.quality" min="0.1" max="1" step="0.1">
            {{ (settings.quality * 100).toFixed(0) }}%
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ImageCompressor } from '../utils/compressors/ImageCompressor';

const testResult = ref(null);
const settings = ref({
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.7
});

async function runCompressionTest(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log('🧪 Test başlıyor...', file.name);

  try {
    // Orijinal dosya URL'si
    const originalUrl = URL.createObjectURL(file);
    
    // Sıkıştırma işlemi
    const compressedFile = await ImageCompressor.compress(file, settings.value);
    const compressedUrl = URL.createObjectURL(compressedFile);

    // Sonuçları kaydet
    testResult.value = {
      original: {
        file: file,
        url: originalUrl,
        size: file.size
      },
      compressed: {
        file: compressedFile,
        url: compressedUrl,
        size: compressedFile.size
      },
      savings: ((file.size - compressedFile.size) / file.size * 100).toFixed(1)
    };

    console.log('✅ Test tamamlandı!', testResult.value);

  } catch (error) {
    console.error('❌ Test hatası:', error);
    alert('Test sırasında hata oluştu: ' + error.message);
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>

<style scoped>
.test-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
}

.test-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.test-section {
  padding: 20px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: white;
}

.upload-area {
  text-align: center;
  padding: 40px;
  border: 2px dashed #cbd5e0;
  border-radius: 10px;
  margin: 20px 0;
}

.file-input {
  display: none;
}

.upload-label {
  display: inline-block;
  padding: 12px 24px;
  background: #4f46e5;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.upload-label:hover {
  background: #4338ca;
}

.results {
  margin-top: 20px;
}

.result-card {
  padding: 20px;
  border-radius: 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.stat.highlight {
  font-weight: bold;
  color: #059669;
  border-bottom: none;
}

.preview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.preview-item {
  text-align: center;
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.preview-img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8fafc;
  border-radius: 6px;
}

.setting-item input[type="number"] {
  width: 80px;
  padding: 5px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
}

.setting-item input[type="range"] {
  width: 150px;
}
</style>
