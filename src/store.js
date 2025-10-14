import { ref } from 'vue'
import { supabase } from './supabaseClient.js'


export const session = ref(null)

supabase.auth.onAuthStateChange((event, currentSession) => {
  session.value = currentSession
})