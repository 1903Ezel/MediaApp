import { createClient } from '@supabase/supabase-js'

// Supabase URL'si doğrudan kodlandı (404 hatasını önlemek için)
const supabaseUrl = 'https://hjgwmynfabnztfzaotkh.supabase.co'

// 🚨 ÖNEMLİ: Bu alana kendi Anon (Public) Anahtarınızı yazmalısınız.
// Supabase panelinizden (Settings -> API) kopyalayın.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZ3dteW5mYWJuenRmemFvdGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjAyNDksImV4cCI6MjA3NTU5NjI0OX0.sNyAQS5xKYp7C35HrfhpQ1k9h4pakLdV0Rx6tacCYyU'; 

const SUPABASE_OPTIONS = (typeof fetch === 'undefined') ? {} : {};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, SUPABASE_OPTIONS);
