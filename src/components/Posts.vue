<script setup>
import { ref, onMounted, watch, defineProps } from 'vue'
import { supabase } from '../supabaseClient.js'
import { session } from '../store.js'
import { Paperclip } from 'lucide-vue-next';

const props = defineProps({
    filter: String
})

const loading = ref(true)
const uploading = ref(false)
const posts = ref([])
const newPostContent = ref('')
const selectedFile = ref(null)
const selectedFileType = ref(null);
const filePreviewUrl = ref(null)

function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) {
        selectedFile.value = null;
        selectedFileType.value = null;
        return;
    };
    selectedFile.value = file
    selectedFileType.value = file.type;
}
watch(selectedFile, (newFile) => {
    if (filePreviewUrl.value) {
        URL.revokeObjectURL(filePreviewUrl.value)
        filePreviewUrl.value = null
    }
    if (newFile) {
        filePreviewUrl.value = URL.createObjectURL(newFile)
    }
})

async function fetchPosts() {
    try {
        loading.value = true
        let query = supabase
            .from('posts')
            // Düzeltme: author:profiles(email) yerine author:profiles(username) kullanıldı
            // Bu, 'column profiles_1.email does not exist' hatasını çözer.
            .select('id, content, created_at, user_id, media_url, media_type, author:profiles(username)')
            .order('created_at', { ascending: false });

        if (props.filter) {
            if (props.filter === 'text') {
                query = query.is('media_type', null);
            } else {
                query = query.like('media_type', `${props.filter}/%`);
            }
        }
            
        const { data, error } = await query;
        if (error) throw error
        posts.value = data
    } catch (error) {
        console.error('Gönderiler Çekilirken Hata:', error.message)
    } finally {
        loading.value = false
    }
}

async function addPost() {
    if (newPostContent.value.trim() === '' && !selectedFile.value) {
        return alert("Paylaşmak için bir not yazın veya bir medya dosyası seçin.");
    }
    try {
        uploading.value = true
        let mediaUrl = null
        let mediaType = null
        if (selectedFile.value) {
            const file = selectedFile.value
            mediaType = file.type;
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${session.value.user.id}/${Date.now()}_${sanitizedFileName}`;
            // KRİTİK DÜZELTME: 'media' kovasının Supabase'de var olduğundan emin olun!
            const { error: uploadError } = await supabase.storage.from('media').upload(filePath, file)
            if (uploadError) throw uploadError
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath)
            mediaUrl = urlData.publicUrl
        }
        const { error: insertError } = await supabase.from('posts').insert({
            // Sütun adının 'content' olduğundan emin olun (veritabanı sıfırlaması varsayılarak)
            content: newPostContent.value,
            user_id: session.value.user.id,
            media_url: mediaUrl,
            media_type: mediaType,
        })
        if (insertError) throw insertError
        newPostContent.value = ''
        selectedFile.value = null
        selectedFileType.value = null
        document.getElementById('file-input').value = null;
    } catch (error) {
        console.error('Ekleme Hatası:', error.message)
        alert('Bir hata oluştu: ' + error.message)
    } finally {
        uploading.value = false
    }
}
async function deletePost(postId) {
    if (!window.confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) return;
    try {
        const { error } = await supabase.from('posts').delete().eq('id', postId)
        if (error) throw error;
    } catch(error) {
        console.error('Silme Hatası:', error.message)
    }
}
onMounted(() => {
    fetchPosts()
    supabase
        .channel('posts_channel')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'posts' },
            (payload) => {
                fetchPosts()
            }
        )
        .subscribe()
})
watch(() => props.filter, (newFilter) => {
    fetchPosts();
})
</script>

<template>
  <div class="w-full max-w-2xl mx-auto space-y-6">
      <form @submit.prevent="addPost" class="bg-black/30 p-4 rounded-lg border border-white/10">
            <textarea
                    v-model="newPostContent"
                    placeholder="Aklından ne geçiyor?"
                    class="w-full p-3 bg-gray-800 border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    rows="3"
            ></textarea>
            <div v-if="filePreviewUrl" class="my-4">
                <img v-if="selectedFileType && selectedFileType.startsWith('image/')" :src="filePreviewUrl" alt="Seçilen resim önizlemesi" class="max-h-48 rounded-lg">
                <video v-else-if="selectedFileType && selectedFileType.startsWith('video/')" :src="filePreviewUrl" controls class="max-h-48 rounded-lg w-full"></video>
                <audio v-else-if="selectedFileType && selectedFileType.startsWith('audio/')" :src="filePreviewUrl" controls class="w-full"></audio>
            </div>
            <div class="mt-2 flex justify-between items-center">
                <label for="file-input" class="flex items-center gap-2 text-purple-400 hover:text-purple-300 cursor-pointer">
                    <Paperclip :size="18" />
                    <span>Medya Ekle</span>
                </label>
                <input type="file" id="file-input" @change="handleFileSelect" accept="image/*,video/*,audio/*" class="hidden">
                <button type="submit" :disabled="uploading" class="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {{ uploading ? 'Yükleniyor...' : 'Paylaş' }}
                </button>
            </div>
        </form>
        <div v-if="loading" class="text-center text-white/50">Yükleniyor...</div>
        <div v-else class="space-y-4">
            <div v-for="post in posts" :key="post.id" class="bg-black/30 p-4 rounded-lg border border-white/10 animate-fade-in">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-sm font-bold text-purple-300">
                        <span v-if="post.author && post.author.username">{{ post.author.username.charAt(0).toUpperCase() }}</span>
                    </div>
                    <span v-if="post.author && post.author.username" class="text-sm font-semibold text-white/70">{{ post.author.username }}</span>
                </div>
                <div v-if="post.media_url && post.media_type" class="my-4 rounded-lg overflow-hidden aspect-square bg-black/20">
                    <img v-if="post.media_type.startsWith('image/')" :src="post.media_url" alt="Gönderi resmi" class="w-full h-full object-contain">
                    <div v-else-if="post.media_type.startsWith('video/')" class="aspect-video">
                        <video :src="post.media_url" controls class="w-full h-full"></video>
                    </div>
                    <div v-else-if="post.media_type.startsWith('audio/')" class="w-full">
                        <audio :src="post.media_url" controls class="w-full"></audio>
                    </div>
                </div>
                <p v-if="post.content" class="text-white/90 whitespace-pre-wrap pl-1">{{ post.content }}</p>
                <div class="text-xs text-white/40 mt-3 flex justify-between items-center">
                    <span>{{ new Date(post.created_at).toLocaleString('tr-TR') }}</span>
                    <button v-if="session && session.user.id === post.user_id" @click="deletePost(post.id)" class="text-red-500 hover:text-red-400">
                        Sil
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>