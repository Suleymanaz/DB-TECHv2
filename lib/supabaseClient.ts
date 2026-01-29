
import { createClient } from '@supabase/supabase-js';

// Environment variables are accessed safely to prevent "undefined" errors
// We check both Vite's import.meta.env and Vercel/Node's process.env
const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore - handled safely
    return (import.meta.env?.[key] || process.env?.[key] || '').trim();
  } catch (e) {
    return '';
  }
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

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
