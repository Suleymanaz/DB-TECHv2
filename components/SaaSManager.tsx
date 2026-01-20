
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Tenant, User, UserRole, AuditLog } from '../types';
import { exportToCSV } from '../utils/helpers';

interface SaaSManagerProps {
  onImpersonate: (user: User) => void;
}

const SaaSManager: React.FC<SaaSManagerProps> = ({ onImpersonate }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [detailTab, setDetailTab] = useState<'users' | 'logs'>('users');
  
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState({ start: '', end: '' });

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
        if (detailTab === 'users') loadTenantUsers(selectedTenant.id);
        if (detailTab === 'logs') loadAuditLogs(selectedTenant.id);
    }
  }, [selectedTenant, detailTab, logFilter]);

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

  const loadAuditLogs = async (tenantId: string) => {
    setLoadingLogs(true);
    const logs = await dataService.getAuditLogs(tenantId, logFilter.start, logFilter.end);
    setAuditLogs(logs);
    setLoadingLogs(false);
  };

  const handleExportLogs = () => {
    if (auditLogs.length === 0) return alert('Dışa aktarılacak kayıt yok.');
    exportToCSV(auditLogs, `Log_Raporu_${selectedTenant?.name}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleUpdateRole = async (user: User, newRole: UserRole) => {
    if (!selectedTenant) return;
    if (!window.confirm(`${user.name} kullanıcısının rolünü ${newRole} olarak değiştirmek istediğinize emin misiniz?`)) return;
    
    const { success, error } = await dataService.updateUserRole(user.id, newRole, selectedTenant.id);
    if (success) {
        alert('Rol güncellendi.');
        loadTenantUsers(selectedTenant.id);
    } else alert('Hata: ' + error);
  };

  const handleDeleteUser = async (user: User) => {
    if (!selectedTenant) return;
    if (!window.confirm(`${user.name} kullanıcısını sistemden KALICI olarak silmek üzeresiniz (Auth kayıtları dahil). Bu işlem geri alınamaz. Onaylıyor musunuz?`)) return;
    
    const { success, error } = await dataService.deleteUser(user.id, selectedTenant.id);
    if (success) {
        alert('Kullanıcı kalıcı olarak silindi.');
        loadTenantUsers(selectedTenant.id);
    } else alert('Hata: ' + error);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { success, error } = await dataService.createTenantOnly(newCompanyName);
    if (success) {
        setNewCompanyName('');
        setShowCompanyModal(false);
        loadTenants();
    } else alert('Hata: ' + error);
    setCreating(false);
  };

  const handleDeleteCompany = async (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    if (!window.confirm(`DİKKAT: "${tenant.name}" şirketini, tüm stoklarını, cari kayıtlarını ve TÜM PERSONELLERİNİN HESAPLARINI kalıcı olarak silmek üzeresiniz. Bu işlem asla geri alınamaz. Devam etmek istiyor musunuz?`)) return;
    
    setLoading(true);
    const { success, error } = await dataService.deleteTenant(tenant.id);
    if (success) {
        alert('Şirket ve tüm bağlı veriler başarıyla temizlendi.');
        loadTenants();
    }
    else { alert('Hata: ' + error); setLoading(false); }
  };

  const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTenant) return;
      setCreating(true);
      const { success, error } = await dataService.createUserForTenant(selectedTenant.id, selectedTenant.name, newUserEmail, newUserPass, newUserName, newUserRole);
      if (success) {
          setShowUserModal(false);
          loadTenantUsers(selectedTenant.id);
          alert('Kullanıcı başarıyla oluşturuldu.');
      } else alert('Hata: ' + error);
      setCreating(false);
  };

  if (selectedTenant) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <button onClick={() => setSelectedTenant(null)} className="flex items-center text-slate-500 hover:text-indigo-600 transition font-bold text-sm">
                <span className="mr-2">←</span> Firma Listesine Dön
            </button>

            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">{selectedTenant.name}</h2>
                        <div className="flex bg-slate-200 p-1 rounded-xl mt-4 w-fit">
                            <button onClick={() => setDetailTab('users')} className={`px-6 py-2 rounded-lg text-xs font-bold transition ${detailTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>PERSONELLER</button>
                            <button onClick={() => setDetailTab('logs')} className={`px-6 py-2 rounded-lg text-xs font-bold transition ${detailTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>LOG KAYITLARI</button>
                        </div>
                    </div>
                    {detailTab === 'users' && (
                        <button onClick={() => setShowUserModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition">+ Personel Ekle</button>
                    )}
                    {detailTab === 'logs' && (
                        <button onClick={handleExportLogs} className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition flex items-center">
                           <span className="mr-2">📊</span> CSV Rapor Al
                        </button>
                    )}
                </div>

                <div className="p-8">
                    {detailTab === 'users' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loadingUsers ? <div className="col-span-full py-10 text-center text-slate-400">Yükleniyor...</div> : tenantUsers.map(u => (
                                <div key={u.id} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">{u.name[0]}</div>
                                        <select 
                                            value={u.role} 
                                            onChange={(e) => handleUpdateRole(u, e.target.value as UserRole)}
                                            className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border-none rounded-lg px-2 py-1 outline-none"
                                        >
                                            <option value={UserRole.ADMIN}>YÖNETİCİ</option>
                                            <option value={UserRole.PURCHASE}>SATIN ALMA</option>
                                            <option value={UserRole.SALES}>SATIŞ</option>
                                        </select>
                                    </div>
                                    <h4 className="font-bold text-lg text-gray-800">{u.name}</h4>
                                    <div className="flex space-x-2 mt-6">
                                        <button onClick={() => onImpersonate(u)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition">Gözlemle</button>
                                        <button onClick={() => handleDeleteUser(u)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition" title="Kullanıcıyı Sil">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Başlangıç Tarihi</label>
                                    <input type="date" value={logFilter.start} onChange={e => setLogFilter({...logFilter, start: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bitiş Tarihi</label>
                                    <input type="date" value={logFilter.end} onChange={e => setLogFilter({...logFilter, end: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <button onClick={() => setLogFilter({start: '', end: ''})} className="px-6 py-3 bg-white text-slate-500 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition">Sıfırla</button>
                            </div>
                            
                            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                                        <tr>
                                            <th className="py-4 px-6">Tarih / Saat</th>
                                            <th className="py-4 px-6">Personel</th>
                                            <th className="py-4 px-6">Eylem</th>
                                            <th className="py-4 px-6">Detaylar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loadingLogs ? <tr><td colSpan={4} className="py-10 text-center">Yükleniyor...</td></tr> : auditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-indigo-50/20 transition">
                                                <td className="py-4 px-6 text-slate-400 font-mono text-[11px]">
                                                    {new Date(log.created_at).toLocaleString('tr-TR')}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-slate-700">{log.user_name}</td>
                                                <td className="py-4 px-6">
                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black uppercase tracking-tighter">{log.action}</span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-500 italic text-xs">{log.details}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <form onSubmit={handleAddUser}>
                            <div className="p-6 border-b bg-gray-50 flex justify-between">
                                <h3 className="font-bold text-gray-800">Personel Ekle</h3>
                                <button type="button" onClick={() => setShowUserModal(false)}>✕</button>
                            </div>
                            <div className="p-8 space-y-4">
                                <input required className="w-full p-3 rounded-xl border" placeholder="Ad Soyad" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
                                <input required type="email" className="w-full p-3 rounded-xl border" placeholder="e-posta@firma.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
                                <input required className="w-full p-3 rounded-xl border" placeholder="Şifre" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
                                <select className="w-full p-3 rounded-xl border" value={newUserRole} onChange={e => setNewUserRole(e.target.value as UserRole)}>
                                    <option value={UserRole.ADMIN}>Yönetici</option>
                                    <option value={UserRole.PURCHASE}>Satın Alma</option>
                                    <option value={UserRole.SALES}>Satış</option>
                                </select>
                            </div>
                            <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowUserModal(false)} className="text-slate-400 font-bold">İptal</button>
                                <button disabled={creating} type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20">{creating ? 'Kaydediliyor...' : 'Personeli Kaydet'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl flex justify-between items-center overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-4xl font-black tracking-tight mb-2">DB Tech SaaS Panel</h2>
          <p className="text-indigo-200 text-sm">Platform üzerindeki tüm şirketleri ve kullanıcı operasyonlarını yönetin.</p>
        </div>
        <button onClick={() => setShowCompanyModal(true)} className="relative z-10 bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition">+ ŞİRKET EKLE</button>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/20 to-transparent"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? <div className="col-span-full py-20 text-center text-gray-400">Veriler Yükleniyor...</div> : tenants.map(t => (
              <div key={t.id} onClick={() => setSelectedTenant(t)} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-200 cursor-pointer transition group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition duration-500">🏢</div>
                      <button onClick={(e) => handleDeleteCompany(e, t)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm">🗑️</button>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1 leading-tight group-hover:text-indigo-600 transition">{t.name}</h3>
                  <p className="text-[10px] font-mono text-slate-400 mb-6 uppercase tracking-widest">TENANT: {t.id}</p>
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-widest">{t.status}</span>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(t.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
              </div>
          ))}
      </div>

      {showCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <form onSubmit={handleCreateCompany}>
                    <div className="p-6 border-b bg-gray-50 flex justify-between">
                        <h3 className="font-bold text-gray-800">Yeni Firma Alanı</h3>
                        <button type="button" onClick={() => setShowCompanyModal(false)}>✕</button>
                    </div>
                    <div className="p-8 space-y-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Şirket Ünvanı</label>
                        <input required className="w-full p-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Örn: Voltech Enerji Ltd." value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} />
                    </div>
                    <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
                        <button type="button" onClick={() => setShowCompanyModal(false)} className="text-slate-400 font-bold">İptal</button>
                        <button disabled={creating} type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20">{creating ? 'Oluşturuluyor...' : 'ŞİRKETİ OLUŞTUR'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default SaaSManager;
