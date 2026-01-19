
import { createClient } from '@supabase/supabase-js';

// .env dosyasından bilgileri okuyoruz
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''; 
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase istemcisini oluştur
export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'placeholder');

// Bağlantı kontrolü
export const isSupabaseConfigured = () => {
  // Sadece URL ve Key dolu mu diye bakar, özel bir string kontrolü yapmaz.
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0 && SUPABASE_URL.includes('supabase.co');
};
