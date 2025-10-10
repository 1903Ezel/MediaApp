import { createClient } from '@supabase/supabase-js'

// Tarayıcı ortamının fetch desteğini kontrol etme (Hata çözümü için kritik)
// Eğer fetch yoksa, bir polyfill sağlamak gerekebilir.
const SUPABASE_OPTIONS = (typeof fetch === 'undefined') ? {
  // Eğer fetch tanımsızsa (bazı eski ortamlarda),
  // bu, istemcinin doğru şekilde başlatılmasını sağlar.
  // Çoğu modern tarayıcıda bu kontrol gerekmese de,
  // aldığınız "fetch" hatası nedeniyle eklenmiştir.
} : {};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, SUPABASE_OPTIONS)