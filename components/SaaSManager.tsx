
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Tenant, User, UserRole } from '../types';

interface SaaSManagerProps {
  onImpersonate: (user: User) => void;
}

const SaaSManager: React.FC<SaaSManagerProps> = ({ onImpersonate }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Modals
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Forms
  const [newCompanyName, setNewCompanyName] = useState('');
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
        loadTenantUsers(selectedTenant.id);
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    setLoading(true);
    const data = await dataService.getAllTenants();
    setTenants(data);
    setLoading(false);
  };

  const loadTenantUsers = async (tenantId: string) => {
    setLoadingUsers(true);
    const users = await dataService.getUsersByTenant(tenantId);
    setTenantUsers(users);
    setLoadingUsers(false);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { success, error } = await dataService.createTenantOnly(newCompanyName);
    if (success) {
        alert('Şirket kaydı açıldı. Şimdi detayına girip yönetici ekleyebilirsiniz.');
        setNewCompanyName('');
        setShowCompanyModal(false);
        loadTenants();
    } else {
        alert('Hata: ' + error);
    }
    setCreating(false);
  };

  const handleDeleteCompany = async (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    if (!window.confirm(`DİKKAT! ${tenant.name} şirketini ve tüm bağlı kullanıcılarını silmek üzeresiniz. Bu işlem geri alınamaz! Onaylıyor musunuz?`)) {
      return;
    }
    
    // İkinci güvenlik onayı
    const verification = prompt(`Silme işlemini onaylamak için lütfen şirket adını yazınız: ${tenant.name}`);
    if (verification !== tenant.name) {
      alert("Şirket adı eşleşmedi, işlem iptal edildi.");
      return;
    }

    setLoading(true);
    const { success, error } = await dataService.deleteTenant(tenant.id);
    if (success) {
      alert(`${tenant.name} başarıyla silindi.`);
      loadTenants();
    } else {
      alert('Silme hatası: ' + error);
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTenant) return;

      const confirmMsg = "Yeni bir kullanıcı oluşturduğunuzda Supabase session'ı bu kullanıcıya geçebilir. İşlem sonunda tekrar giriş yapmanız gerekebilir.";
      if (!window.confirm(confirmMsg)) return;

      setCreating(true);
      const { success, error } = await dataService.createUserForTenant(
          selectedTenant.id, 
          selectedTenant.name, 
          newUserEmail, 
          newUserPass, 
          newUserName, 
          newUserRole
      );

      if (success) {
          alert('Kullanıcı başarıyla şirkete eklendi.');
          setNewUserEmail('');
          setNewUserPass('');
          setNewUserName('');
          setShowUserModal(false);
          loadTenantUsers(selectedTenant.id);
          // Session fix uyarısı
          alert('DİKKAT: Güvenlik gereği yeni kullanıcının oturumu açılmış olabilir. Sayfayı yenileyip tekrar giriş yapınız.');
          window.location.reload();
      } else {
          alert('Hata: ' + error);
      }
      setCreating(false);
  };

  const handleImpersonateClick = (user: User) => {
      if (window.confirm(`${user.name} kullanıcısı (Şirket: ${selectedTenant?.name}) olarak sisteme giriş yapılacak. Onaylıyor musunuz?`)) {
          onImpersonate(user);
      }
  };

  // --- VIEWS ---

  if (selectedTenant) {
      // COMPANY DETAIL VIEW
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
                <button onClick={() => setSelectedTenant(null)} className="flex items-center text-slate-500 hover:text-indigo-600 transition font-bold text-sm">
                    <span className="mr-2">←</span> Firma Listesine Dön
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">{selectedTenant.name}</h2>
                        <p className="text-xs font-mono text-slate-400 mt-1">Tenant ID: {selectedTenant.id}</p>
                    </div>
                    <button onClick={() => setShowUserModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition">
                        + Personel Ekle
                    </button>
                </div>

                <div className="p-8">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center">
                        <span className="bg-indigo-100 text-indigo-700 p-2 rounded-lg mr-3">👥</span> 
                        Tanımlı Kullanıcılar
                    </h3>
                    
                    {loadingUsers ? (
                        <div className="text-center py-10 text-gray-400">Kullanıcılar yükleniyor...</div>
                    ) : tenantUsers.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-400 font-medium">Bu şirkete henüz bir yönetici veya personel atanmamış.</p>
                            <button onClick={() => setShowUserModal(true)} className="mt-4 text-indigo-600 font-bold hover:underline">İlk Yöneticiyi Ekle</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tenantUsers.map(u => (
                                <div key={u.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {u.name[0]}
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-1 rounded">{u.role}</span>
                                    </div>
                                    <h4 className="font-bold text-lg text-gray-800">{u.name}</h4>
                                    <p className="text-sm text-gray-500 mb-4">Kullanıcı ID: {u.id.substring(0,8)}...</p>
                                    
                                    <button 
                                        onClick={() => handleImpersonateClick(u)}
                                        className="w-full py-3 rounded-xl border-2 border-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-800 hover:text-white hover:border-slate-800 transition flex items-center justify-center"
                                    >
                                        <span className="mr-2">👁️</span> Yönetici Olarak Gir
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ADD USER MODAL */}
            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <form onSubmit={handleAddUser}>
                            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Personel Tanımla: {selectedTenant.name}</h3>
                                <button type="button" onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <div className="p-8 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ad Soyad</label>
                                    <input required className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ad Soyad" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">E-Posta (Giriş İçin)</label>
                                    <input required type="email" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="email@sirket.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Şifre</label>
                                    <input required type="text" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="******" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Yetki Seviyesi</label>
                                    <select className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" value={newUserRole} onChange={e => setNewUserRole(e.target.value as UserRole)}>
                                        <option value={UserRole.ADMIN}>Şirket Yöneticisi</option>
                                        <option value={UserRole.PURCHASE}>Satın Alma Personeli</option>
                                        <option value={UserRole.SALES}>Satış Personeli</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">İptal</button>
                                <button disabled={creating} type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:bg-gray-400">
                                    {creating ? 'Ekleniyor...' : 'Kullanıcıyı Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // COMPANY LIST VIEW
  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center bg-indigo-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-2">DB Tech Yönetim Paneli</h2>
          <p className="text-indigo-200 text-sm max-w-xl">Müşteri firmaları (tenant) buradan yönetebilirsiniz. Kullanıcı eklemek için firma detayına giriniz.</p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-600 to-transparent opacity-50"></div>
        <button 
            onClick={() => setShowCompanyModal(true)}
            className="relative z-10 bg-white text-indigo-900 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition shadow-xl"
        >
            + Yeni Firma Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
              <div className="col-span-full text-center py-20 text-gray-400">Veriler Yükleniyor...</div>
          ) : tenants.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300 text-gray-500">
                  Henüz hiç firma tanımlanmamış.
              </div>
          ) : (
              tenants.map(t => (
                  <div key={t.id} onClick={() => setSelectedTenant(t)} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 cursor-pointer transition group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                          <span className="text-6xl">🏢</span>
                      </div>
                      <div className="relative z-10">
                          <div className="flex justify-between items-start">
                              <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-indigo-600 transition">{t.name}</h3>
                              <button 
                                onClick={(e) => handleDeleteCompany(e, t)}
                                className="z-20 w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"
                                title="Şirketi Sil"
                              >
                                  🗑️
                              </button>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mb-4">{t.id}</p>
                          <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">{t.status}</span>
                              <span className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                          <div className="mt-6 pt-4 border-t border-gray-50 flex items-center text-indigo-600 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                              Yönetimi Aç →
                          </div>
                      </div>
                  </div>
              ))
          )}
      </div>

      {showCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <form onSubmit={handleCreateCompany}>
                    <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Yeni Firma Tanımla</h3>
                        <button type="button" onClick={() => setShowCompanyModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="p-8 space-y-4">
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs">
                            Bu işlem sadece firma alanını oluşturur. Firma oluşturulduktan sonra detayına girerek yönetici kullanıcı ekleyebilirsiniz.
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Firma Ünvanı</label>
                            <input required className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Örn: Mervolt Elektrik Ltd." value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                        <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">İptal</button>
                        <button disabled={creating} type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:bg-gray-400">
                            {creating ? 'Oluşturuluyor...' : 'Firma Alanını Aç'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SaaSManager;
