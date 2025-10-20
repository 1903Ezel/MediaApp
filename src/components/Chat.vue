<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { supabase } from "../supabaseClient.js";
import { session } from "../store.js";
import { Send } from "lucide-vue-next";

const loading = ref(true);
const messages = ref([]);
const newMessage = ref("");
const chatContainer = ref(null);

// --- Mesajları Getir ---
async function fetchMessages() {
  try {
    loading.value = true;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, content, created_at, sender:profiles(username, id)")
      .order("created_at", { ascending: true });

    if (error) throw error;
    messages.value = data;
  } catch (error) {
    console.error("Mesajlar çekilirken hata:", error);
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

// --- Mesaj Gönder ve Bildirimi Tetikle (GÜNCELLENDİ) ---
async function addMessage() {
  if (!session.value || !session.value.user) {
    alert("Oturum bulunamadı. Lütfen giriş yapın.");
    return;
  }

  const content = newMessage.value.trim();
  if (content === "") return;
  
  // Mesajı gönderirken input'u hemen temizle
  newMessage.value = "";

  try {
    // Adım 1: Mesajı ekle ve eklenen satırın ID'sini geri al
    const { data: newInsertedMessage, error: insertError } = await supabase
      .from("chat_messages")
      .insert({
        content: content,
        sender_id: session.value.user.id,
      })
      .select("id") // Bu çok önemli! Eklenen satırın ID'sini geri döndürür.
      .single();

    if (insertError) throw insertError;

    console.log("Mesaj başarıyla eklendi, ID:", newInsertedMessage.id);

    // Adım 2: Ekleme başarılıysa, dönen mesajın ID'si ile RPC fonksiyonunu çağır
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "send_notification",
      {
        message_id: newInsertedMessage.id,
      }
    );

    if (rpcError) {
      console.error("Bildirim gönderme fonksiyonu hatası:", rpcError);
    } else {
      // Bu logu görüyorsanız, bildirim başarıyla gönderilmiştir!
      console.log("✅ Bildirim fonksiyonu sunucudan cevap verdi:", rpcData);
    }
  } catch (error) {
    console.error("Mesaj gönderme/bildirim sürecinde hata:", error.message);
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

// --- Realtime Abonelik ---
onMounted(() => {
  fetchMessages();

  supabase
    .channel("chat_room")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      () => fetchMessages()
    )
    .subscribe();
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
          'justify-end': session?.user?.id === message.sender.id,
        }"
      >
        <div
          class="max-w-[80%] p-3 rounded-xl shadow-md transition-all duration-200"
          :class="{
            'bg-purple-600 text-white rounded-br-none':
              session?.user?.id === message.sender.id,
            'bg-gray-700 text-white rounded-bl-none':
              session?.user?.id !== message.sender.id,
          }"
        >
          <div class="text-xs font-semibold mb-1 text-purple-200">
            {{ message.sender.username || "Bilinmeyen Kullanıcı" }}
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
