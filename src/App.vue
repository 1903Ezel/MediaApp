<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from './supabaseClient';
import { session } from './store'; // Global store'dan session alınıyor
import Chat from './components/Chat.vue';
import Posts from './components/Posts.vue';

// Yeni ikonları içe aktarıyoruz
import { 
  LogOut, ArrowLeft, Home, BookText, ImageIcon, Film, Music, MessageSquare, 
  Gift, PartyPopper 
} from "lucide-vue-next"; 
import MenuButton from './components/MenuButton.vue'; // MenuButton'ı içe aktardığınızı varsayıyorum.

// Mevcut state'ler
const activeView = ref('menu'); // 'menu', 'chat', 'posts', 'ezel', 'melik', 'nihal'
const currentFilter = ref(null);

// Mevcut fonksiyonlar
function navigateTo(view, filter = null) {
  activeView.value = view;
  currentFilter.value = filter;
}

function navigateToMenu() {
  activeView.value = 'menu';
}

async function handleLogout() {
  await supabase.auth.signOut();
}

// 👇 YENİ EKLEDİĞİMİZ FONKSİYON: Harici URL'yi yeni sekmede açar
function openUrl(url) {
  window.open(url, '_blank');
}

// Oturum kontrolü (store.js'de yapıldığı için burada sadece reaktif olarak kullanıyoruz)
onMounted(() => {
  // Uygulama yüklendiğinde başka bir işlem gerekirse buraya eklenebilir.
});
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 relative">
    
    <div v-if="session?.user">
      <div class="h-[calc(100vh-2rem)] w-full max-w-4xl mx-auto flex flex-col">
        
        <header class="w-full flex justify-between items-center mb-10 sticky top-0 bg-gray-900/90 z-20 py-4">
          <div class="flex items-center gap-2">
            <!-- Kullanıcı E-postası gösteriliyor -->
            <span class="text-2xl font-bold text-purple-400">D</span>
            <span class="text-sm font-light text-white">{{ session.user.email }}</span>
          </div>
          <div>
            <!-- Çıkış Yap Butonu -->
            <button
              @click="handleLogout"
              class="flex items-center gap-2 text-sm bg-black/30 text-red-400 hover:text-red-500 p-2 rounded-lg"
            >
              <LogOut :size="16" />
              <span class="hidden sm:inline">Çıkış Yap</span>
            </button>
          </div>
        </header>

        <main class="animate-fade-in w-full flex-1 flex flex-col items-center justify-center">
          
          <!-- ANA MENÜ GÖRÜNÜMÜ -->
          <div v-if="activeView === 'menu'" class="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            
            <!-- MEVCUT 6 BUTON -->
            <MenuButton @click="navigateTo('posts', null)" label="Tüm Akış"><Home :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'text')" label="Notlar"><BookText :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'image')" label="Fotoğraflar"><ImageIcon :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'video')" label="Videolar"><Film :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('posts', 'audio')" label="Sesler"><Music :size="36" class="text-white/80" /></MenuButton>
            <MenuButton @click="navigateTo('chat')" label="Anlık Sohbet"><MessageSquare :size="36" class="text-white/80" /></MenuButton>
            
            <!-- 👇 YENİ EKLENEN 3 DOĞUM GÜNÜ BUTONU (Kırmızı işaretli alan) -->
            <MenuButton 
              @click="openUrl('https://www.timeanddate.com/countdown/birthday?iso=20251129T19&p0=107&msg=Ezel+Do%C4%9Fumg%C3%BCn%C3%BC&font=cursive')" 
              label="Ezel Doğumgünü"
            >
              <Gift :size="36" class="text-white/80" />
            </MenuButton>
            
            <MenuButton 
              @click="openUrl('https://www.timeanddate.com/countdown/birthday?iso=20251119T17&p0=107&msg=Melik+Do%C4%9Fumg%C3%BCn%C3%BC&font=cursive')" 
              label="Melik Doğumgünü"
            >
              <PartyPopper :size="36" class="text-white/80" />
            </MenuButton>
            
            <MenuButton 
              @click="openUrl('https://www.timeanddate.com/countdown/birthday?iso=20260731T17&p0=805&msg=Nihal+Do%C4%9Fumg%C3%BCn%C3%BC&font=cursive')" 
              label="Nihal Doğumgünü"
            >
              <Gift :size="36" class="text-white/80" />
            </MenuButton>
            
          </div>

          <!-- DİĞER VİEW'LAR (Chat veya Posts) -->
          <div v-else class="w-full h-full flex flex-col">
            <button
              @click="navigateToMenu"
              class="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-6 self-start"
            >
              <ArrowLeft :size="16" />
              Ana Menüye Dön
            </button>
            <div class="flex-1">
              <Chat v-if="activeView === 'chat'" :onBack="navigateToMenu" />
              <Posts v-if="activeView === 'posts'" :filter="currentFilter" />
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>
