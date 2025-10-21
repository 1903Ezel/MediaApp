<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { supabase } from "../supabaseClient.js"; 
import { Send, LogOut, MessageSquare } from "lucide-vue-next";
import { session } from '../store.js'; 
import notificationService from '../services/notificationService.js'; 

const loading = ref(true);
const messages = ref([]);
const newMessage = ref("");
const chatContainer = ref(null);
const subscription = ref(null); 

// Mesajları yeni 'messages' tablosundan alıyoruz
async function fetchMessages() {
  try {
    loading.value = true;
    const { data, error } = await supabase
      .from("messages") 
      .select(`
        id, 
        content, 
        created_at, 
        sender_id,
        sender:profiles!messages_sender_id_fkey(id, username)
      `)
      .order("created_at", { ascending: true });

    if (error) throw error;
    messages.value = data || [];
  } catch (error) {
    console.error("❌ Mesajlar alınırken hata:", error.message);
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

// Profilin varlığını kontrol eden ve yoksa oluşturan fonksiyon
async function ensureProfile(user) {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existing) {
      // Eğer kullanıcı profil oluşturmadan giriş yaptıysa, temel bir profil oluştururuz.
      await supabase.from("profiles").insert({
        id: user.id,
        // E-posta adresinin @ işaretinden önceki kısmını kullanıcı adı olarak kullanır.
        username: user.email ? user.email.split("@")[0] : `user_${user.id.substring(0, 8)}`, 
      });
    }
  } catch (err) {
    console.error("⚠️ Profil kontrolü hatası:", err.message);
  }
}

async function addMessage() {
  const content = newMessage.value.trim();
  if (content === "") return;

  const user = session.value?.user; 
  if (!user) return alert("Giriş yapmalısınız.");

  await ensureProfile(user); 
  const temp = newMessage.value;
  newMessage.value = ""; 

  try {
    const { error } = await supabase
      .from("messages") 
      .insert({
        sender_id: user.id,
        content,
      });

    if (error) throw error;
  } catch (err) {
    console.error("❌ Mesaj gönderme hatası:", err.message);
    newMessage.value = temp; 
  }
}

async function handleLogout() {
    await supabase.auth.signOut();
}

// YENİ: Otomatik push aboneliği fonksiyonu
async function initializePushSubscription(user) {
  if (!user) return;
  
  console.log('👤 Kullanıcı tespit edildi, push aboneliği başlatılıyor...');
  
  // OneSignal'in yüklenmesi için 3 saniye bekle
  setTimeout(async () => {
    try {
      console.log('🔔 Push aboneliği deneniyor...');
      const success = await notificationService.requestPermission(user.id);
      console.log('🎯 Push aboneliği sonucu:', success);
      
      if (success) {
        // Başarılı olduğunda abonelikleri göster
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id);
        console.log('📋 Mevcut aboneliklerim:', subs);
      }
    } catch (error) {
      console.error('💥 Push aboneliği hatası:', error);
    }
  }, 3000);
}

onMounted(async () => {
  // 1. İlk mesajları getir
  await fetchMessages();

  // 2. Realtime Aboneliği Kur 
  if (subscription.value) subscription.value.unsubscribe(); 

  subscription.value = supabase
    .channel("grup-chat")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages", 
      },
      async (payload) => {
        // Yeni mesaj verisi geldi, profil bilgisini de alıp listeye ekle
        const { data: senderData } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("id", payload.new.sender_id)
          .single();
        
        const newMessage = {
            ...payload.new,
            sender: senderData,
        };

        messages.value.push(newMessage);
        scrollToBottom();
      }
    )
    .subscribe();

  // 3. YENİ: Otomatik push aboneliği
  if (session.value?.user) {
    initializePushSubscription(session.value.user);
  }

  // 4. Session değiştiğinde push aboneliğini başlat
  watch(session, (newSession) => {
    if (newSession?.user) {
      initializePushSubscription(newSession.user);
    }
  });

  // 5. Yeni mesaj geldiğinde otomatik aşağı kaydır
  watch(messages, scrollToBottom, { deep: true, flush: 'post' }); 

  return () => {
    // Bileşen ayrıldığında Realtime aboneliğini temizle
    if (subscription.value) subscription.value.unsubscribe();
  };
});
</script>

<template>
  <div class="flex flex-col h-full bg-black/40 rounded-xl shadow-2xl backdrop-blur-sm border border-purple-500/30 overflow-hidden">
    
    <!-- SABIT ÜST BAR - WhatsApp gibi -->
    <div class="shrink-0 p-4 flex justify-between items-center bg-gray-900/80 border-b border-purple-500/30">
      <div class="flex items-center gap-3">
        <MessageSquare :size="24" class="text-purple-400" />
        <h2 class="text-xl font-bold text-white">Grup Sohbet Odası</h2>
      </div>
      <button v-if="session?.user" @click="handleLogout" class="text-sm text-red-400 hover:text-red-500 flex items-center gap-1 transition">
        <LogOut :size="18" />
        Çıkış Yap
      </button>
    </div>

    <!-- MESAJ ALANI - SADECE BURASI SCROLL OLACAK -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
      <div v-if="loading" class="text-white/50 text-center py-8">
        Mesajlar yükleniyor...
      </div>
      <div v-else-if="messages.length === 0" class="text-white/50 text-center py-8">
        Henüz mesaj yok. İlk mesajı sen gönder!
      </div>

      <div
        v-for="m in messages"
        :key="m.id"
        class="flex"
        :class="{ 'justify-end': session?.user?.id === m.sender_id }"
      >
        <div
          class="max-w-[80%] p-3 rounded-xl shadow-lg break-words"
          :class="{
            'bg-purple-600 text-white rounded-br-none': session?.user?.id === m.sender_id,
            'bg-gray-700 text-white rounded-bl-none': session?.user?.id !== m.sender_id,
          }"
        >
          <div v-if="session?.user?.id !== m.sender_id" class="text-xs font-semibold mb-1" :class="{'text-purple-200': session?.user?.id === m.sender_id, 'text-green-300': session?.user?.id !== m.sender_id}">
            {{ m.sender?.username || "Anonim" }}
          </div>
          <p class="text-base">{{ m.content }}</p>
          <div class="text-[10px] text-right mt-1 text-white/70">
            {{ new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) }}
          </div>
        </div>
      </div>
    </div>

    <!-- SABIT ALT BAR - Mesaj yazma alanı ASLA HAREKET ETMEYECEK -->
    <div class="shrink-0 p-4 bg-gray-900/80 border-t border-purple-500/30">
      <form @submit.prevent="addMessage" class="flex gap-3">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Mesajınızı yazın..."
          class="flex-1 px-4 py-3 rounded-full bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          required
        />
        <button
          type="submit"
          class="p-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-semibold transition disabled:bg-gray-500 disabled:opacity-50"
          :disabled="newMessage.trim() === '' || !session?.user"
        >
          <Send :size="20" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* WhatsApp benzeri scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.5);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.7);
}

/* Mobile uyumluluk */
@media (max-width: 768px) {
  .bg-black\/40 {
    border-radius: 0;
    border: none;
  }
}

/* KESİN SABIT LAYOUT */
.flex-col {
  display: flex;
  flex-direction: column;
  height: 100vh; /* Tam ekran yüksekliği */
}

.shrink-0 {
  flex-shrink: 0; /* Asla küçülmesin */
}

.flex-1 {
  flex: 1; /* Mesaj alanı kalan tüm alanı kaplasın */
  min-height: 0; /* Scroll için gerekli */
}
</style>
