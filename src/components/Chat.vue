<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { supabase } from '../supabase.js';
import { session } from '../store.js';

const messages = ref([]);
const newMessageContent = ref('');
const loading = ref(true);
const messagesContainer = ref(null);

async function fetchMessages() {
  // İlişki adını (foreign key) user_id yerine sender_id olarak düzeltiyoruz
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, sender:profiles(email)') // *** Düzeltme: author yerine sender kullanıldı (profiles tablosuna referans) ***
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Mesajlar çekilirken hata:", error);
  } else {
    messages.value = data;
  }
  loading.value = false;
}

async function sendMessage() {
  if (newMessageContent.value.trim() === '') return;
  const content = newMessageContent.value;
  newMessageContent.value = '';

  // ⚠️ HATA DÜZELTME: user_id yerine sender_id kullanılıyor
  const { error } = await supabase.from('chat_messages').insert({
    content: content,
    sender_id: session.value.user.id, // *** Düzeltme: user_id -> sender_id ***
  });

  if (error) {
    // Mesaj gönderme hatasını konsola detaylıca yazdırıyoruz
    console.error("MESAJ GÖNDERME BAŞARISIZ OLDU:", error);
    
    let errorMessage = `Hata Kodu: ${error.code || 'Bilinmiyor'}. Mesaj: ${error.message}`;
    
    if (error.status === 404) {
        errorMessage = "404 Not Found: Tablo adı yanlış olabilir veya RLS engelliyor olabilir. Lütfen RLS'i kontrol edin.";
    } else if (error.status === 401 || error.code === 'PGRST301') {
        errorMessage = "401 Yetkisiz: Oturum açık değil veya RLS politikası engelliyor.";
    }

    alert(`Mesaj gönderilemedi! ${errorMessage}`);
    // Mesaj içeriğini geri yükleyelim
    newMessageContent.value = content; 
  } else {
    console.log("✅ Mesaj başarıyla gönderildi (veya API tarafından kabul edildi).");
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

onMounted(() => {
  fetchMessages();
  supabase
    .channel('chat_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
    (payload) => {
      fetchMessages(); 
    })
    .subscribe();
});

watch(messages, () => {
  scrollToBottom();
}, { deep: true });
</script>

<template>
  <div class="flex flex-col h-[70vh] w-full max-w-2xl mx-auto">
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 rounded-t-lg">
      <div v-if="loading" class="text-center text-white/50">Mesajlar yükleniyor...</div>
      <div v-for="message in messages" :key="message.id" 
          :class="['flex flex-col', message.sender && message.sender.email === session.user.email ? 'items-end' : 'items-start']">
        <div :class="['max-w-xs md:max-w-md p-3 rounded-xl', message.sender && message.sender.email === session.user.email ? 'bg-purple-700' : 'bg-gray-700']">
          <!-- Burada da author yerine sender kullanıldı -->
          <div v-if="message.sender && message.sender.email !== session.user.email" class="text-xs text-purple-300 font-semibold mb-1">
            {{ message.sender.email.split('@')[0] }}
          </div>
          <p class="text-white text-sm">{{ message.content }}</p>
        </div>
        <span class="text-xs text-white/40 mt-1 px-1">{{ new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }}</span>
      </div>
    </div>
    <form @submit.prevent="sendMessage" class="p-4 bg-black/30 rounded-b-lg">
      <input
        v-model="newMessageContent"
        type="text"
        placeholder="Bir mesaj yazın..."
        class="w-full p-3 bg-gray-800 border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
      />
    </form>
  </div>
</template>
