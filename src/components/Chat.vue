<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { supabase } from "../supabaseClient.js"; 
import { Send, LogOut, MessageSquare, Bell } from "lucide-vue-next";
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
      await supabase.from("profiles").insert({
        id: user.id,
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

// İZİN VER butonu fonksiyonu
async function requestPermission() {
  if (!session.value?.user) {
    alert('❌ Önce giriş yapmalısınız!');
    return;
  }
  
  try {
    console.log('🔔 Bildirim izni isteniyor...');
    
    // Push izni iste
    const result = await notificationService.requestPermission(session.value.user.id);
    
    if (result) {
      alert('✅ Bildirim izni başarılı!');
      
      // Abonelikleri kontrol et
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', session.value.user.id);
      
      console.log('📋 Aboneliklerim:', subs);
      
      if (subs && subs.length > 0) {
        alert(`📱 ${subs.length} adet aboneliğiniz var!`);
      } else {
        alert('⚠️ Abonelik oluşmadı!');
      }
    } else {
      alert('❌ Bildirim izni alınamadı!');
    }
    
  } catch (error) {
    console.error('💥 İzin hatası:', error);
    alert('❌ Hata: ' + error.message);
  }
}

// Otomatik push aboneliği fonksiyonu
async function initializePushSubscription(user) {
  if (!user) return;
  
  console.log('👤 Kullanıcı tespit edildi, push aboneliği başlatılıyor...');
  
  setTimeout(async () => {
    try {
      console.log('🔔 Push aboneliği deneniyor...');
      const success = await notificationService.requestPermission(user.id);
      console.log('🎯 Push aboneliği sonucu:', success);
      
      if (success) {
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
  await fetchMessages();

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

  if (session.value?.user) {
    initializePushSubscription(session.value.user);
  }

  watch(session, (newSession) => {
    if (newSession?.user) {
      initializePushSubscription(newSession.user);
    }
  });

  watch(messages, scrollToBottom, { deep: true, flush: 'post' }); 

  return () => {
    if (subscription.value) subscription.value.unsubscribe();
  };
});
</script>

<template>
  <!-- KESİN SABIT LAYOUT -->
  <div class="chat-container">
    
    <!-- SABIT ÜST BAR - WhatsApp gibi -->
    <div class="chat-header">
      <div class="header-left">
        <MessageSquare :size="24" class="text-purple-400" />
        <h2 class="chat-title">sohbet</h2>
      </div>
      <div class="header-buttons">
        <button 
          @click="requestPermission" 
          class="permission-btn"
        >
          <Bell :size="16" />
          <span class="btn-text">İzin ver</span>
        </button>
        <button 
          v-if="session?.user" 
          @click="handleLogout" 
          class="logout-btn"
        >
          <LogOut :size="18" />
          <span class="btn-text">Çıkış</span>
        </button>
      </div>
    </div>

    <!-- SADECE BURASI SCROLL -->
    <div ref="chatContainer" class="messages-area">
      <div v-if="loading" class="loading-message">
        Mesajlar yükleniyor...
      </div>
      <div v-else-if="messages.length === 0" class="empty-message">
        Henüz mesaj yok. İlk mesajı sen gönder!
      </div>

      <div
        v-for="m in messages"
        :key="m.id"
        class="message-wrapper"
        :class="{ 'own-message': session?.user?.id === m.sender_id }"
      >
        <div
          class="message-bubble"
          :class="{
            'own-bubble': session?.user?.id === m.sender_id,
            'other-bubble': session?.user?.id !== m.sender_id,
          }"
        >
          <div v-if="session?.user?.id !== m.sender_id" class="sender-name">
            {{ m.sender?.username || "Anonim" }}
          </div>
          <p class="message-content">{{ m.content }}</p>
          <div class="message-time">
            {{ new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) }}
          </div>
        </div>
      </div>
    </div>

    <!-- SABIT ALT BAR -->
    <div class="input-area">
      <form @submit.prevent="addMessage" class="message-form">
        <input
          v-model="newMessage"
          type="text"
          placeholder="Mesajınızı yazın..."
          class="message-input"
          required
        />
        <button
          type="submit"
          class="send-btn"
          :disabled="newMessage.trim() === '' || !session?.user"
        >
          <Send :size="20" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* KESİN SABIT LAYOUT - TÜM CİHAZLAR İÇİN */
.chat-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  overflow: hidden;
}

/* ÜST BAR - KESİNLİKLE SABIT */
.chat-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(31, 41, 55, 0.8);
  border-bottom: 1px solid rgba(168, 85, 247, 0.3);
  min-height: 60px;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chat-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.permission-btn, .logout-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap; /* BUTON METNİ TEK SATIR */
  border: none;
  cursor: pointer;
}

.permission-btn {
  background: rgb(22, 163, 74);
  color: white;
}

.permission-btn:hover {
  background: rgb(21, 128, 61);
}

.logout-btn {
  background: transparent;
  color: rgb(248, 113, 113);
}

.logout-btn:hover {
  color: rgb(239, 68, 68);
  background: rgba(239, 68, 68, 0.1);
}

.btn-text {
  white-space: nowrap; /* METİN KESİNLİKLE TEK SATIR */
}

/* MESAJ ALANI - SADECE BURASI SCROLL */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}

/* SCROLLBAR STILI */
.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.5);
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.7);
}

.loading-message, .empty-message {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  padding: 2rem 0;
}

/* MESAJ STILLERI */
.message-wrapper {
  display: flex;
  margin-bottom: 1rem;
}

.own-message {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 80%;
  padding: 0.75rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  word-wrap: break-word;
}

.own-bubble {
  background: rgb(147, 51, 234);
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.other-bubble {
  background: rgb(55, 65, 81);
  color: white;
  border-bottom-left-radius: 0.25rem;
}

.sender-name {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: rgb(134, 239, 172);
}

.message-content {
  font-size: 1rem;
  margin: 0;
  line-height: 1.4;
}

.message-time {
  font-size: 0.625rem;
  text-align: right;
  margin-top: 0.25rem;
  color: rgba(255, 255, 255, 0.7);
}

/* ALT BAR - KESİNLİKLE SABIT */
.input-area {
  flex-shrink: 0;
  padding: 1rem;
  background: rgba(31, 41, 55, 0.8);
  border-top: 1px solid rgba(168, 85, 247, 0.3);
  z-index: 1000;
}

.message-form {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 9999px;
  background: rgb(31, 41, 55);
  color: white;
  border: 1px solid rgb(75, 85, 99);
  outline: none;
  font-size: 1rem;
}

.message-input:focus {
  border-color: rgb(168, 85, 247);
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2);
}

.send-btn {
  padding: 0.75rem;
  border-radius: 9999px;
  background: rgb(147, 51, 234);
  color: white;
  border: none;
  transition: background-color 0.2s;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  background: rgb(126, 34, 206);
}

.send-btn:disabled {
  background: rgb(107, 114, 128);
  opacity: 0.5;
  cursor: not-allowed;
}

/* MOBILE OPTIMIZASYONU */
@media (max-width: 768px) {
  .chat-container {
    border-radius: 0;
  }
  
  .chat-header {
    padding: 0.75rem;
    min-height: 56px;
  }
  
  .messages-area {
    padding: 0.75rem;
  }
  
  .input-area {
    padding: 0.75rem;
  }
  
  .message-bubble {
    max-width: 85%;
  }
  
  /* BUTONLAR MOBILE'DE DAHA KÜÇÜK */
  .permission-btn, .logout-btn {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .chat-title {
    font-size: 1.125rem;
  }
  
  .message-input {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
  }
}

/* PWA SAFE AREA DESTEĞİ */
@media (display-mode: standalone) {
  .chat-container {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* YÜKSEK ÇÖZÜNÜRLÜK EKRANLAR İÇİN */
@media (min-width: 1200px) {
  .chat-container {
    max-width: 800px;
    margin: 0 auto;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 12px;
    top: 20px;
    bottom: 20px;
    height: calc(100dvh - 40px);
  }
}
</style>
