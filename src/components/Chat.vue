<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { supabase } from "../supabaseClient.js"; 
import { Send } from "lucide-vue-next";

const loading = ref(true);
const messages = ref([]);
const newMessage = ref("");
const chatContainer = ref(null);
const session = ref(null); 

// --- Oturumu Al ---
async function getSession() {
  const { data: { session: currentSession } } = await supabase.auth.getSession();
  session.value = currentSession;
}

// --- Mesajları Getir ---
async function fetchMessages() {
  try {
    loading.value = true;
    
    // Grup sohbet mesajları (recipient_id null olanlar)
    const { data, error } = await supabase
      .from("chat_messages")
      .select(`
        id, 
        content, 
        created_at, 
        sender_id,
        sender:profiles!chat_messages_sender_id_fkey(id, username)
      `)
      .is('recipient_id', null)  // Sadece grup mesajları
      .order("created_at", { ascending: true });

    if (error) throw error;
    messages.value = data || [];
  } catch (error) {
    console.error("Mesajlar çekilirken hata:", error);
    messages.value = [];
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

// --- Profil Oluştur veya Al ---
async function ensureUserProfile(userId, userEmail) {
  try {
    // Önce profil var mı kontrol et
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return existingProfile;
    }

    // Profil yoksa oluştur
    const username = userEmail?.split('@')[0] || 'Kullanıcı';
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: username
      })
      .select('id, username')
      .single();

    if (error) throw error;
    return newProfile;
    
  } catch (error) {
    console.error('Profil işlemi hatası:', error);
    return null;
  }
}

// --- Mesaj Gönder ---
async function addMessage() {
  const content = newMessage.value.trim();
  if (content === "") return;

  const tempMessage = newMessage.value; 
  newMessage.value = ""; 

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("Kullanıcı oturumu bulunamadı.");
      alert("Giriş bilgileriniz bulunamadı.");
      newMessage.value = tempMessage;
      return;
    }

    // Profil kontrolü ve oluşturma
    await ensureUserProfile(user.id, user.email);

    // Grup mesajı gönder (recipient_id = null)
    const { error } = await supabase.from("chat_messages").insert({
      content: content,
      sender_id: user.id,
      recipient_id: null,  // Grup mesajı için null
      status: 'sent'       // Status ekle
    });

    if (error) {
      newMessage.value = tempMessage; 
      throw error;
    }

    console.log("Mesaj başarıyla gönderildi.");

  } catch (error) {
    console.error("Mesaj gönderme hatası:", error.message);
    alert("Mesaj gönderilirken bir hata oluştu: " + error.message);
    newMessage.value = tempMessage;
  }
}

// --- Scroll to Bottom ---
function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

// --- Realtime ve Oturum Abonelikleri ---
onMounted(async () => {
  await getSession(); 
  
  supabase.auth.onAuthStateChange((_, currentSession) => {
    session.value = currentSession;
  });

  await fetchMessages();

  // Realtime abonelik
  const subscription = supabase
    .channel("group_chat")
    .on(
      "postgres_changes",
      { 
        event: "INSERT", 
        schema: "public", 
        table: "chat_messages",
        filter: "recipient_id=is.null"  // Sadece grup mesajlarını dinle
      },
      (payload) => {
        console.log("Yeni grup mesajı alındı:", payload);
        fetchMessages();
      }
    )
    .subscribe((status) => {
      console.log("Realtime subscription status:", status);
    });

  // Cleanup function
  return () => {
    subscription.unsubscribe();
  };
});

watch(messages, scrollToBottom, { deep: true });
</script>

<template>
  <div
    class="bg-black/40 rounded-xl p-4 flex flex-col h-full shadow-2xl backdrop-blur-sm border border-purple-500/30"
  >
    <h2 class="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">
      Grup Sohbet Odası 💬
    </h2>

    <div
      ref="chatContainer"
      class="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar"
    >
      <div v-if="loading" class="text-white/50 text-center py-8">
        Mesajlar yükleniyor...
      </div>
      <div
        v-else-if="messages.length === 0"
        class="text-white/50 text-center py-8"
      >
        Henüz mesaj yok. İlk mesajı sen gönder!
      </div>

      <div
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="{
          'justify-end': session?.user?.id === message.sender_id,
        }"
      >
        <div
          class="max-w-[80%] p-3 rounded-xl shadow-md transition-all duration-200"
          :class="{
            'bg-purple-600 text-white rounded-br-none':
              session?.user?.id === message.sender_id,
            'bg-gray-700 text-white rounded-bl-none':
              session?.user?.id !== message.sender_id,
          }"
        >
          <div class="text-xs font-semibold mb-1 text-purple-200">
            {{ message.sender?.username || "Bilinmeyen Kullanıcı" }}
          </div>
          <p class="whitespace-pre-wrap">{{ message.content }}</p>
          <div class="text-[10px] text-right mt-1 text-purple-300">
            {{
              new Date(message.created_at).toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }}
          </div>
        </div>
      </div>
    </div>

    <form @submit.prevent="addMessage" class="mt-4 flex gap-3">
      <input
        v-model="newMessage"
        type="text"
        placeholder="Mesajınızı yazın..."
        class="flex-1 px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-purple-500 transition-all"
        required
      />
      <button
        type="submit"
        class="p-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:bg-gray-500 shadow-md hover:shadow-lg"
        :disabled="newMessage.trim() === ''"
      >
        <Send :size="20" />
      </button>
    </form>
  </div>
</template>

<style scoped>
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
</style>
