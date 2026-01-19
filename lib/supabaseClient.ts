
import { createClient } from '@supabase/supabase-js';

// .env dosyasından bilgileri okuyoruz ve boşlukları temizliyoruz (trim)
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Geçerli bir URL yapısı değilse uyar
if (SUPABASE_URL && !SUPABASE_URL.startsWith('http')) {
    console.error('VITE_SUPABASE_URL geçerli bir URL formatında değil.');
}

// Supabase istemcisini oluştur
// Eğer env yoksa placeholder değerler kullanır ki app çökmesin, Login ekranında uyarı versin.
export const supabase = createClient(
    SUPABASE_URL || 'https://placeholder.supabase.co', 
    SUPABASE_ANON_KEY || 'placeholder'
);

// Bağlantı konfigürasyonu kontrolü
export const isSupabaseConfigured = () => {
  return SUPABASE_URL.length > 0 && 
         SUPABASE_ANON_KEY.length > 0 && 
         SUPABASE_URL.includes('supabase.co');
};
