import { createClient } from '@supabase/supabase-js'

// ✅ Supabase URL ve Anon Key (senin projenin bilgileri)
const supabaseUrl = 'https://hjgwmynfabnztfzaotkh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZ3dteW5mYWJuenRmemFvdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjAyNDksImV4cCI6MjA3NTU5NjI0OX0.sNyAQS5xKYp7C35HrfhpQ1k9h4pakLdV0Rx6tacCYyU'

// 👇 Ek güvenlik için otomatik yeniden bağlanma ve realtime optimizasyon
const options = {
  realtime: {
    params: { eventsPerSecond: 5 },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options)
