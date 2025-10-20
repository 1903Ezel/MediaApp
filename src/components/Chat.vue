<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { supabase } from "../supabaseClient.js";
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

// --- Mesaj Gönder --- (RLS HATASINI ÇÖZMEK İÇİN GÜNCELLENDİ)
async function addMessage() {
  const content = newMessage.value.trim();
  if (content === "") return;

  try {
    // 1. GÜVENLİ YÖNTEM: Mesajı göndermeden hemen önce güncel kullanıcıyı al.
    // Bu, session state'inin eski veya hatalı olma ihtimalini ortadan kaldırır.
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("Kullanıcı oturumu bulunamadı. Mesaj gönderilemiyor.");
      alert("Giriş bilgileriniz bulunamadı. Lütfen sayfayı yenileyin veya tekrar giriş yapın.");
      return;
    }

    const userId = user.id; // En güncel ve doğru kullanıcı ID'sini kullan
    newMessage.value = ""; // Input'u hemen temizle

    // 2. Mesajı, doğrulanmış kullanıcı ID'si ile ekle.
    const { error } = await supabase.from("chat_messages").insert({
      content: content,
      sender_id: userId, // Güvenli bir şekilde kullanıcı ID'sini ekle
    });

    if (error) {
      // Eğer burada bir hata olursa, bu %99 ihtimalle RLS hatasıdır.
      throw error;
    }

    console.log("Mesaj başarıyla veritabanına eklendi. Bildirim tetikleyicisi çalıştırıldı.");

  } catch (error) {
    console.error("Mesaj gönderme sürecinde hata:", error.message);
    // Hata durumunda kullanıcıya bilgi ver ve yazdığı mesajı geri yükle
    alert("Mesaj gönderilirken bir hata oluştu: " + error.message);
    newMessage.value = content;
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

