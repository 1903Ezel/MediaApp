<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
import { supabase } from "../supabaseClient.js";
import { Send } from "lucide-vue-next";

const loading = ref(true);
const messages = ref([]);
const newMessage = ref("");
const chatContainer = ref(null);
const session = ref(null);

async function getSession() {
  const { data: { session: currentSession } } = await supabase.auth.getSession();
  session.value = currentSession;
}

async function fetchMessages() {
  try {
    loading.value = true;
    const { data, error } = await supabase
      .from("chat_messages") // ✅ doğru tablo
      .select(`
        id, 
        content, 
        created_at, 
        sender_id,
        sender:profiles!chat_messages_sender_id_fkey(id, username)
      `)
      .is("recipient_id", null)
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
        email: user.email,
        username: user.email.split("@")[0],
      });
    }
  } catch (err) {
    console.warn("⚠️ Profil kontrolü hatası:", err.message);
  }
}

async function addMessage() {
  const content = newMessage.value.trim();
  if (content === "") return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("Giriş yapmalısınız.");

  await ensureProfile(user);
  const temp = newMessage.value;
  newMessage.value = "";

  try {
    const { error } = await supabase
      .from("chat_messages") // ✅ doğru tablo
      .insert({
        sender_id: user.id,
        recipient_id: null,
        content,
      });

    if (error) throw error;
  } catch (err) {
    console.error("❌ Mesaj gönderme hatası:", err.message);
    newMessage.value = temp;
  }
}

onMounted(async () => {
  await getSession();
  await fetchMessages();

  supabase.auth.onAuthStateChange((_, currentSession) => {
    session.value = currentSession;
  });

  const subscription = supabase
    .channel("chat-room")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: "recipient_id=is.null",
      },
      (payload) => {
        console.log("🟣 Yeni mesaj geldi:", payload.new);
        fetchMessages();
      }
    )
    .subscribe();

  watch(messages, scrollToBottom, { deep: true });

  return () => subscription.unsubscribe();
});
</script>

<template>
  <div
    class="bg-black/40 rounded-xl p-4 flex flex-col h-full shadow-2xl backdrop-blur-sm border border-purple-500/30"
  >
    <h2 class="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">
      Grup Sohbet Odası 💬
    </h2>

    <div ref="chatContainer" class="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
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
          class="max-w-[80%] p-3 rounded-xl shadow-md"
          :class="{
            'bg-purple-600 text-white rounded-br-none': session?.user?.id === m.sender_id,
            'bg-gray-700 text-white rounded-bl-none': session?.user?.id !== m.sender_id,
          }"
        >
          <div class="text-xs font-semibold mb-1 text-purple-200">
            {{ m.sender?.username || "Anonim" }}
          </div>
          <p>{{ m.content }}</p>
          <div class="text-[10px] text-right mt-1 text-purple-300">
            {{ new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) }}
          </div>
        </div>
      </div>
    </div>

    <form @submit.prevent="addMessage" class="mt-4 flex gap-3">
      <input
        v-model="newMessage"
        type="text"
        placeholder="Mesajınızı yazın..."
        class="flex-1 px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-purple-500"
        required
      />
      <button
        type="submit"
        class="p-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition disabled:bg-gray-500"
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
