<script setup>
import { ref, onMounted, watch, nextTick, computed } from "vue";
import { supabase } from "../supabaseClient.js"; 
import { Send, LogOut, Bell, ArrowLeft, User } from "lucide-vue-next";
import { session } from '../store.js'; 
import notificationService from '../services/notificationService.js'; 

// App.vue'den gelen prop'u tanımla
const props = defineProps({
  onBack: {
    type: Function,
    default: () => {}
  }
});

const loading = ref(true);
const messages = ref([]);
const newMessage = ref("");
const chatContainer = ref(null);
const subscription = ref(null); 
const isSafari = ref(false);

// Kullanıcı adını computed property olarak al
const currentUsername = computed(() => {
  if (!session.value?.user?.email) return "Kullanıcı";
  return session.value.user.email.split("@")[0];
});

// ANA MENÜYE DÖNME FONKSİYONU
function goToMainMenu() {
  console.log('🔙 Ana menüye dönülüyor...');
  
  if (props.onBack) {
    props.onBack();
  } else {
    window.history.back();
  }
}

// MESAJ FONKSİYONLARI
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
    safeScrollToBottom();
  }
}

// SAFARİ İÇİN GÜVENLİ SCROLL
function safeScrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      try {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        // Safari için ek güvenlik
        setTimeout(() => {
          if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
          }
        }, 100);
      } catch (error) {
        console.log('Safari scroll hatası:', error);
      }
    }
  });
}

// PROFİL KONTROLÜ
async function ensureProfile(user) {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", user.id)
      .single();

    if (!existing) {
      const autoUsername = user.email ? 
        user.email.split("@")[0] : 
        `user_${user.id.substring(0, 8)}`;
      
      await supabase.from("profiles").insert({
        id: user.id,
        username: autoUsername,
      });
      console.log('✅ Profil oluşturuldu - Username:', autoUsername);

    } else if (!existing.username) {
      const autoUsername = user.email ? 
        user.email.split("@")[0] : 
        `user_${user.id.substring(0, 8)}`;
      
      await supabase.from("profiles")
        .update({ username: autoUsername })
        .eq('id', user.id);
      console.log('✅ Username güncellendi:', autoUsername);
    }
  } catch (err) {
    console.error("⚠️ Profil kontrolü hatası:", err.message);
  }
}

// MESAJ GÖNDERME
async function addMessage() {
  const content = newMessage.value.trim();
  if (content === "") return;

  const user = session.value?.user; 
  if (!user) {
    alert("Giriş yapmalısınız.");
    return;
  }

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

    await sendNotificationToOthers(user.id, content);

  } catch (err) {
    console.error("❌ Mesaj gönderme hatası:", err.message);
    newMessage.value = temp; 
  }
}

// BİLDİRİM GÖNDERME FONKSİYONU
async function sendNotificationToOthers(senderId, messageContent) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', senderId)
      .single();

    const username = profile?.username || `user_${senderId.substring(0, 8)}`;

    const { error } = await supabase.functions.invoke('send-notification', {
      body: { 
        sender_id: senderId,
        message_content: messageContent,
        sender_username: username
      }
    });

    if (error) throw error;
    console.log('✅ Bildirim gönderildi - Gönderen:', username);
  } catch (error) {
    console.error('❌ Bildirim gönderme hatası:', error);
  }
}

async function handleLogout() {
  try {
    await supabase.auth.signOut();
    console.log('✅ Çıkış yapıldı');
  } catch (error) {
    console.error('❌ Çıkış hatası:', error);
  }
}

// İZİN VER BUTONU
async function requestPermission() {
  if (!session.value?.user) {
    alert('❌ Önce giriş yapmalısınız!');
    return;
  }
  
  try {
    console.log('🔔 Bildirim izni isteniyor...');
    
    const result = await notificationService.requestPermission(session.value.user.id);
    
    if (result) {
      alert('✅ Bildirim izni başarılı!');
      
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

// OTOMATİK PUSH ABONELİĞİ
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

// Enter tuşu ile mesaj gönderme
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    addMessage();
  }
}

onMounted(async () => {
  // Safari tespiti
  isSafari.value = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
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
        safeScrollToBottom();
      }
    )
    .subscribe();

  // Safari için input focus yönetimi
  if (isSafari.value) {
    const messageInput = document.querySelector('.message-input');
    if (messageInput) {
      messageInput.addEventListener('focus', () => {
        setTimeout(() => {
          safeScrollToBottom();
        }, 300);
      });
    }
  }

  if (session.value?.user) {
    initializePushSubscription(session.value.user);
  }

  watch(session, (newSession) => {
    if (newSession?.user) {
      initializePushSubscription(newSession.user);
    }
  });

  watch(messages, safeScrollToBottom, { deep: true, flush: 'post' }); 

  return () => {
    if (subscription.value) subscription.value.unsubscribe();
  };
});
</script>

<template>
  <div class="chat-container" :class="{ 'is-safari': isSafari }">
    
    <!-- SABIT ÜST BAR -->
    <div class="chat-header">
      <div class="header-left">
        <button @click="goToMainMenu" class="back-btn" title="Ana menüye dön">
          <ArrowLeft :size="24" class="text-white" />
        </button>
        <div class="user-info">
          <div class="user-name">Sohbet Odası</div>
          <div v-if="session?.user" class="user-email">
            <User :size="12" />
            {{ currentUsername }}
          </div>
        </div>
      </div>

      <div class="header-buttons">
        <button 
          @click="requestPermission" 
          class="permission-btn"
          title="Bildirim izni ver"
        >
          <Bell :size="18" />
          <span class="btn-text">İzin ver</span>
        </button>
        <button 
          v-if="session?.user" 
          @click="handleLogout" 
          class="logout-btn"
          title="Çıkış yap"
        >
          <LogOut :size="18" />
        </button>
      </div>
    </div>

    <!-- MESAJ ALANI -->
    <div ref="chatContainer" class="messages-area">
      <div v-if="loading" class="loading-message">
        Mesajlar yükleniyor...
      </div>
      <div v-else-if="messages.length === 0" class="empty-message">
        <div class="empty-icon">💬</div>
        <p>Henüz mesaj yok.</p>
        <p class="empty-subtitle">İlk mesajı sen gönder!</p>
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
          @keypress="handleKeyPress"
          type="text"
          placeholder="Mesajınızı yazın..."
          class="message-input"
          required
        />
        <button
          type="submit"
          class="send-btn"
          :disabled="newMessage.trim() === '' || !session?.user"
          title="Mesajı gönder"
        >
          <Send :size="20" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* TEMEL LAYOUT */
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
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ÜST BAR */
.chat-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(31, 41, 55, 0.95);
  border-bottom: 1px solid rgba(168, 85, 247, 0.3);
  min-height: 64px;
  z-index: 1000;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.back-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 1.125rem;
  font-weight: bold;
  color: white;
  line-height: 1.2;
}

.user-email {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.2;
}

.header-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.permission-btn, .logout-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s;
  white-space: nowrap;
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
  padding: 0.5rem;
}

.logout-btn:hover {
  color: rgb(239, 68, 68);
  background: rgba(239, 68, 68, 0.1);
}

.btn-text {
  white-space: nowrap;
}

/* MESAJ ALANI */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  box-sizing: border-box;
  background: transparent;
}

/* SCROLLBAR */
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

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  opacity: 0.7;
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
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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
  word-break: break-word;
}

.message-time {
  font-size: 0.625rem;
  text-align: right;
  margin-top: 0.25rem;
  color: rgba(255, 255, 255, 0.7);
}

/* ALT BAR */
.input-area {
  flex-shrink: 0;
  padding: 1rem;
  background: rgba(31, 41, 55, 0.95);
  border-top: 1px solid rgba(168, 85, 247, 0.3);
  z-index: 1000;
  box-sizing: border-box;
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
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
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
  box-sizing: border-box;
}

.send-btn:hover:not(:disabled) {
  background: rgb(126, 34, 206);
  transform: scale(1.05);
}

.send-btn:disabled {
  background: rgb(107, 114, 128);
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* MOBILE OPTIMIZASYONU */
@media (max-width: 768px) {
  .chat-container {
    border-radius: 0;
  }
  
  .chat-header {
    padding: 0.5rem 0.75rem;
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
  
  .user-name {
    font-size: 1rem;
  }
  
  .user-email {
    font-size: 0.7rem;
  }
  
  .permission-btn {
    padding: 0.375rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .message-input {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
  }
}

/* SAFARİ ÖZEL STİLLERİ */
.is-safari .chat-container {
  position: fixed;
  width: 100%;
  height: 100%;
}

.is-safari .messages-area {
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
}

.is-safari .message-input {
  -webkit-appearance: none;
  border-radius: 9999px;
}

/* Safari için backdrop filter fallback */
@supports not (backdrop-filter: blur(8px)) {
  .chat-container {
    background: rgba(0, 0, 0, 0.6);
  }
}

/* Safari için focus stilleri */
.message-input:focus {
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

/* Safari buton stilleri */
.send-btn, .back-btn, .permission-btn, .logout-btn {
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

/* Safari için form önleme */
.message-form {
  -webkit-user-select: none;
  user-select: none;
}

/* Safari input zoom önleme */
@media screen and (max-width: 768px) {
  .message-input {
    font-size: 16px;
  }
}

/* Safari için animasyon optimizasyonu */
.message-bubble {
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

/* Safari için safe area ek güvenlik */
@supports (padding: max(0px)) {
  .is-safari .chat-container {
    padding-top: max(env(safe-area-inset-top), 0px);
    padding-bottom: max(env(safe-area-inset-bottom), 0px);
    padding-left: max(env(safe-area-inset-left), 0px);
    padding-right: max(env(safe-area-inset-right), 0px);
  }
}

/* Safari PWA standalone modu */
@media all and (display-mode: standalone) {
  .is-safari .chat-container {
    height: 100vh;
    height: calc(100vh - env(safe-area-inset-bottom));
  }
}

/* Safari için scrollbar */
.messages-area::-webkit-scrollbar {
  width: 4px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.6);
  border-radius: 2px;
}

/* Safari için buton aktif durumu */
.send-btn:active {
  transform: scale(0.95);
  transition: transform 0.1s;
}

/* Safari input placeholder rengi */
.message-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
  opacity: 1;
}

/* Safari için selection rengi */
.message-content::selection {
  background: rgba(168, 85, 247, 0.3);
}

/* Safari için hardware acceleration */
.chat-container {
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-perspective: 1000;
  perspective: 1000;
}

/* MOBILE SAFARİ OPTIMIZASYONU */
@media (max-width: 768px) {
  .is-safari .chat-header {
    padding: 0.5rem 0.75rem;
    position: sticky;
    top: 0;
  }
  
  .is-safari .input-area {
    padding: 0.75rem;
    position: sticky;
    bottom: 0;
  }
  
  .is-safari .messages-area {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* SAFARİ 14+ DESTEĞİ */
@supports (height: 100dvh) {
  .is-safari .chat-container {
    height: 100dvh;
  }
}

/* Eski Safari versiyonları için fallback */
@supports not (height: 100dvh) {
  .is-safari .chat-container {
    height: 100vh;
    height: -webkit-fill-available;
  }
}

/* PWA SAFE AREA DESTEĞİ */
@supports (padding: max(0px)) {
  .chat-container {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
}

/* KOYU TEMA OPTIMIZASYONLARI */
@media (prefers-color-scheme: dark) {
  .chat-container {
    background: rgba(0, 0, 0, 0.6);
  }
}

/* YÜKSEK KONTRAST DESTEĞİ */
@media (prefers-contrast: high) {
  .chat-header {
    background: rgb(17, 24, 39);
    border-bottom-color: rgb(168, 85, 247);
  }
  
  .input-area {
    background: rgb(17, 24, 39);
    border-top-color: rgb(168, 85, 247);
  }
}
</style>
