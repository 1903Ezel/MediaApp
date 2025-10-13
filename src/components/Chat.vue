<script setup>
import { ref, onMounted, watch } from 'vue';
import { supabase } from '../supabase.js';
import { session } from '../store.js';
import { Send } from 'lucide-vue-next';

// 1. Birebir sohbet için tanımlanan prop'lar artık genel sohbet odasında gerekli değildir. Kaldırılıyor.
// const props = defineProps({ ... });

const loading = ref(true);
const messages = ref([]);
const newMessage = ref('');
const chatContainer = ref(null);

async function fetchMessages() {
    try {
        loading.value = true;
        
        // KRİTİK: Tüm mesajları çekmeye devam ediyoruz (Genel Sohbet Odası)
        const { data, error } = await supabase
            .from('chat_messages')
            .select('id, content, created_at, sender:profiles(username, id)')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        messages.value = data;

    } catch (error) {
        console.error('Mesajlar çekilirken hata:', error);
    } finally {
        loading.value = false;
        scrollToBottom();
    }
}

async function addMessage() {
    if (newMessage.value.trim() === '') return;

    // 🚨 KRİTİK DÜZELTME: Artık recipient_id alanını bilinçli olarak göndermiyoruz. 
    // Bu alan veritabanında NULL kalacak, bu da Edge Function için "GENEL BİLDİRİM" sinyali olacak.
    
    try {
        const { error } = await supabase
            .from('chat_messages')
            .insert({ 
                content: newMessage.value, 
                sender_id: session.value.user.id
                // recipient_id BURADAN KALDIRILDI. NULL olarak kaydedilecek.
            });

        if (error) throw error;
        newMessage.value = '';

    } catch (error) {
        console.error('Mesaj gönderilirken hata:', error.message);
        // alert('Mesaj gönderilirken bir hata oluştu: ' + error.message);
    }
}

function scrollToBottom() {
    // Mesajlar yüklendikten veya eklendikten sonra en alta kaydır
    if (chatContainer.value) {
        setTimeout(() => {
             chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }, 50);
    }
}

onMounted(() => {
    fetchMessages();

    // Gerçek zamanlı dinleyici
    supabase
        .channel('chat_room')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
                fetchMessages(); 
            }
        )
        .subscribe();
});

watch(messages, scrollToBottom, { deep: true });
</script>

<template>
    <div class="bg-black/40 rounded-xl p-4 flex flex-col h-full shadow-2xl backdrop-blur-sm border border-purple-500/30">
        <!-- Başlık sabit "Anlık Sohbet Odası" olarak kalıyor -->
        <h2 class="text-2xl font-bold text-white mb-4 border-b border-white/10 pb-2">
            Anlık Sohbet Odası
        </h2>
        
        <!-- Mesaj Listesi -->
        <div ref="chatContainer" class="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <div v-if="loading" class="text-white/50 text-center py-8">Mesajlar yükleniyor...</div>
            <div v-else-if="messages.length === 0" class="text-white/50 text-center py-8">Henüz mesaj yok. İlk mesajı sen gönder!</div>

            <div v-for="message in messages" :key="message.id" class="flex" :class="{'justify-end': message.sender.username === session.value.user.user_metadata.username}">
                
                <div 
                    class="max-w-[80%] p-3 rounded-xl shadow-md transition-all duration-200"
                    :class="{
                        'bg-purple-600 text-white rounded-br-none': message.sender.username === session.value.user.user_metadata.username,
                        'bg-gray-700 text-white rounded-bl-none': message.sender.username !== session.value.user.user_metadata.username
                    }"
                >
                    <div class="text-xs font-semibold mb-1"
                        :class="{'text-purple-200': message.sender.username === session.value.user.user_metadata.username, 'text-gray-300': message.sender.username !== session.value.user.user_metadata.username}">
                        <!-- KRİTİK DÜZELTME: message.sender.email yerine message.sender.username kullanıldı -->
                        {{ message.sender.username || 'Bilinmeyen Kullanıcı' }}
                    </div>
                    <p class="whitespace-pre-wrap">{{ message.content }}</p>
                    <div class="text-[10px] text-right mt-1"
                        :class="{'text-purple-300': message.sender.username === session.value.user.user_metadata.username, 'text-gray-400': message.sender.username !== session.value.user.user_metadata.username}">
                        {{ new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Mesaj Gönderme Formu -->
        <form @submit.prevent="addMessage" class="mt-4 flex gap-3">
            <input
                v-model="newMessage"
                type="text"
                placeholder="Mesajınızı buraya yazın..."
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
/* Scrollbar özelleştirmesi (sadece WebKit tarayıcılar için) */
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(168, 85, 247, 0.5); /* Purple-500'ün yarım şeffaflığı */
    border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(168, 85, 247, 0.7);
}
</style>
