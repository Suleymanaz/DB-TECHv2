
import React, { useState } from 'react';
import { User } from '../types';
import { dataService } from '../services/dataService';
import { isSupabaseConfigured } from '../lib/supabaseClient';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<{status: string, message?: string, details?: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, error: loginError } = await dataService.login(username, password);
      if (user) {
        if (rememberMe) {
          localStorage.setItem('db_erp_user', JSON.stringify(user));
        }
        onLogin(user);
      } else {
        // Hata mesajını daha açıklayıcı hale getirdik
        setError(loginError || 'Giriş yapılamadı. Kullanıcı adı veya şifre hatalı olabilir.');
      }
    } catch (err: any) {
      setError('Kritik Sistem Hatası: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionDetails({ status: 'testing' });
    const result = await dataService.testConnection();
    if (result.success) {
      setConnectionDetails({ status: 'success', message: result.message });
    } else {
      setConnectionDetails({ status: 'error', message: result.message, details: result.details });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-black">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center text-5xl shadow-2xl shadow-indigo-500/30 mb-8 border border-indigo-400/20 rotate-12 hover:rotate-0 transition-transform duration-500">
            🏢
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">DB ERP SaaS</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">DB Tech Bulut Yönetim Platformu</p>
          {!isSupabaseConfigured() && (
             <p className="mt-2 text-[9px] text-orange-500 bg-orange-900/20 inline-block px-2 py-1 rounded border border-orange-900/50">
               ⚠️ Backend Bağlantısı Yok - Demo Modu Aktif
             </p>
          )}
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800 rounded-[2rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
             <h2 className="text-white font-bold text-xl">Kurumsal Giriş</h2>
             <p className="text-slate-400 text-xs mt-2">Lütfen size tanımlanan hesap bilgileriyle giriş yapın.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                {isSupabaseConfigured() ? 'E-Posta Adresi' : 'Kullanıcı Adı (Demo: admin)'}
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">👤</span>
                <input
                  type={isSupabaseConfigured() ? 'email' : 'text'}
                  required
                  autoFocus
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  placeholder={isSupabaseConfigured() ? 'ornek@sirket.com' : 'admin'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                Şifre
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors">🔒</span>
                <input
                  type="password"
                  required
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center ml-1">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2 text-xs font-medium text-slate-400 cursor-pointer select-none">
                  Beni Hatırla
                </label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-xl flex items-center animate-shake">
                <span className="mr-2">⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-xl mt-4 ${
                loading 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/20'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                </div>
              ) : (
                'Sisteme Giriş Yap'
              )}
            </button>
          </form>

          {/* Connection Test Button */}
          {isSupabaseConfigured() && (
             <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
                <button 
                  type="button"
                  onClick={handleTestConnection}
                  className="text-[10px] text-slate-600 hover:text-indigo-400 transition flex items-center justify-center mx-auto space-x-2"
                >
                  <span>📡</span>
                  <span className="underline decoration-slate-700 underline-offset-4">Veritabanı Bağlantısını Test Et</span>
                </button>
                
                {connectionDetails && (
                    <div className={`mt-4 p-3 rounded-xl border text-[10px] text-left ${
                        connectionDetails.status === 'success' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                        : connectionDetails.status === 'error'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    }`}>
                        {connectionDetails.status === 'testing' && <p>Bağlantı kontrol ediliyor...</p>}
                        {connectionDetails.status !== 'testing' && (
                            <>
                                <p className="font-bold">{connectionDetails.message}</p>
                                {connectionDetails.details && <p className="mt-1 opacity-75">{connectionDetails.details}</p>}
                            </>
                        )}
                    </div>
                )}
             </div>
          )}

          <div className="mt-4 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              <span className="flex items-center">
                <span className="mr-2">🔒</span> DB Tech Tarafından Korunmaktadır
              </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
