
import React from 'react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'inventory' | 'purchases' | 'sales' | 'transactions' | 'contacts' | 'saas' | 'expenses' | 'finance' | 'settings' | 'proposals';
  setActiveTab: (tab: any) => void;
  userRole: UserRole;
  onLogout: () => void;
  isImpersonating?: boolean;
  onExitImpersonation?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole, onLogout, isImpersonating, onExitImpersonation }) => {
  
  const superAdminItems = [
    { id: 'saas', label: 'DB Tech Panel', icon: '🏢' },
  ];

  const tenantItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: '🏠', roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: 'inventory', label: 'Stok Listesi', icon: '📋', roles: [UserRole.ADMIN, UserRole.PURCHASE, UserRole.SALES, UserRole.SUPER_ADMIN] },
    { id: 'contacts', label: 'Cari Kartlar', icon: '👥', roles: [UserRole.ADMIN, UserRole.PURCHASE, UserRole.SALES, UserRole.SUPER_ADMIN] },
    { id: 'purchases', label: 'Mal Alımı', icon: '📥', roles: [UserRole.ADMIN, UserRole.PURCHASE, UserRole.SUPER_ADMIN] },
    { id: 'sales', label: 'Satış İşlemi', icon: '📤', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN] },
    { id: 'proposals', label: 'Teklifler', icon: '📄', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.SUPER_ADMIN] },
    { id: 'expenses', label: 'Masraflar', icon: '🧾', roles: [UserRole.ADMIN, UserRole.PURCHASE, UserRole.SUPER_ADMIN] },
    { id: 'transactions', label: 'İşlem Geçmişi', icon: '📜', roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: 'finance', label: 'Mali Tablo', icon: '📊', roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️', roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
  ];

  let displayItems = [];
  
  if (userRole === UserRole.SUPER_ADMIN && !isImpersonating) {
    displayItems = superAdminItems.map(item => ({...item, roles: [UserRole.SUPER_ADMIN]}));
  } else {
    displayItems = tenantItems.filter(item => item.roles.includes(userRole) || isImpersonating);
  }

  return (
    <div className={`w-20 md:w-64 text-white flex flex-col transition-all duration-300 shrink-0 border-r border-slate-900 sticky top-0 h-screen z-20 ${isImpersonating ? 'bg-orange-950' : 'bg-slate-950'}`}>
      <div className="p-6 flex items-center space-x-3 mb-6">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-lg border ${isImpersonating ? 'bg-orange-600 border-orange-400' : 'bg-indigo-600 border-indigo-400/20'}`}>
            {isImpersonating ? '👁️' : 'DB'}
        </div>
        <div className="hidden md:block">
          <span className="text-xl font-black tracking-tighter">DB ERP</span>
          <p className={`text-[8px] font-bold uppercase tracking-widest -mt-1 ${isImpersonating ? 'text-orange-400' : 'text-indigo-400'}`}>
            {isImpersonating ? 'Gözlem Modu' : 'By DB Tech'}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {displayItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center p-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? (isImpersonating ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30')
                : 'text-slate-500 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="text-xl mr-0 md:mr-3">{item.icon}</span>
            <span className="font-semibold text-sm hidden md:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 mt-auto">
        {userRole === UserRole.SUPER_ADMIN && !isImpersonating && (
          <div className="mb-4 px-3 py-2 bg-indigo-900/20 rounded-lg border border-indigo-900/50">
            <p className="text-[10px] text-indigo-400 font-bold uppercase">Süper Admin Modu</p>
          </div>
        )}
        
        {isImpersonating ? (
           <button onClick={onExitImpersonation} className="w-full flex items-center p-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg animate-pulse">
             <span className="text-xl mr-0 md:mr-3">🔙</span>
             <span className="font-bold text-xs hidden md:inline uppercase">Yöneticiye Dön</span>
           </button>
        ) : (
           <button onClick={onLogout} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all">
             <span className="text-xl mr-0 md:mr-3">🚪</span>
             <span className="font-medium text-sm hidden md:inline">Sistemden Ayrıl</span>
           </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
