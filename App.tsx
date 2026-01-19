
import React, { useState, useCallback, useEffect } from 'react';
import { Product, Transaction, Contact, ContactType, TransactionType, User, UserRole } from './types';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Transactions from './components/Transactions';
import PurchaseModule from './components/PurchaseModule';
import SalesModule from './components/SalesModule';
import ContactManager from './components/ContactManager';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import SaaSManager from './components/SaaSManager';
import { dataService } from './services/dataService';
import { isSupabaseConfigured } from './lib/supabaseClient';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'purchases' | 'sales' | 'transactions' | 'contacts' | 'saas'>('dashboard');
  
  // Impersonation State
  const [originalAdmin, setOriginalAdmin] = useState<User | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Check Local Storage for Remembered User
  useEffect(() => {
    const storedUser = localStorage.getItem('db_erp_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('db_erp_user');
      }
    }
  }, []);

  // Initial Data Fetching when User Logs In
  useEffect(() => {
    if (currentUser) {
      const fetchData = async () => {
        setIsLoadingData(true);
        try {
          const fetchedProducts = await dataService.getProducts(currentUser.companyId);
          const fetchedContacts = await dataService.getContacts(currentUser.companyId);
          const fetchedTransactions = await dataService.getTransactions(currentUser.companyId);
          
          setProducts(fetchedProducts);
          setContacts(fetchedContacts);
          setTransactions(fetchedTransactions);
        } catch (e) {
          console.error("Veri yükleme hatası", e);
        } finally {
          setIsLoadingData(false);
        }
      };
      
      // Süper Admin için otomatik olarak yönetim paneline yönlendir (Eğer impersonate yapmıyorsa)
      if (currentUser.role === UserRole.SUPER_ADMIN && activeTab === 'dashboard' && !originalAdmin) {
          setActiveTab('saas');
      }

      fetchData();
    }
  }, [currentUser, originalAdmin]);

  // Role based tab restriction
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === UserRole.SALES && (activeTab === 'dashboard' || activeTab === 'purchases' || activeTab === 'transactions' || activeTab === 'saas')) {
        setActiveTab('inventory');
      }
      if (currentUser.role === UserRole.PURCHASE && (activeTab === 'sales' || activeTab === 'transactions' || activeTab === 'dashboard' || activeTab === 'saas')) {
        setActiveTab('inventory');
      }
      // If regular admin (or impersonated admin), hide SaaS panel
      if (currentUser.role === UserRole.ADMIN && activeTab === 'saas') {
        setActiveTab('dashboard'); 
      }
    }
  }, [currentUser, activeTab]);

  // --- IMPERSONATION LOGIC ---
  const handleImpersonate = (targetUser: User) => {
      setOriginalAdmin(currentUser); // Save the super admin
      setCurrentUser(targetUser); // Switch context
      setActiveTab('dashboard'); // Go to their dashboard
  };

  const handleExitImpersonation = () => {
      if (originalAdmin) {
          setCurrentUser(originalAdmin);
          setOriginalAdmin(null);
          setActiveTab('saas');
      }
  };
  // ---------------------------

  const addTransaction = useCallback(async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);

    setProducts(prevProducts => {
      const updatedProducts = [...prevProducts];
      tx.items.forEach(item => {
        if (!item.isLabor && item.productId) {
          const idx = updatedProducts.findIndex(p => p.id === item.productId);
          if (idx !== -1) {
            const change = tx.type === TransactionType.IN ? item.quantity : -item.quantity;
            updatedProducts[idx] = { 
              ...updatedProducts[idx], 
              stock: updatedProducts[idx].stock + change 
            };
          }
        }
      });
      return updatedProducts;
    });
    
    await dataService.saveTransaction(tx, currentUser?.companyId);

  }, [currentUser]);

  const upsertProduct = useCallback(async (product: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      return exists ? prev.map(p => p.id === product.id ? product : p) : [...prev, product];
    });
    await dataService.upsertProduct(product, currentUser?.companyId);
    if (currentUser?.companyId) {
        const fresh = await dataService.getProducts(currentUser.companyId);
        setProducts(fresh);
    }
  }, [currentUser]);

  const bulkUpsertProducts = useCallback(async (newProducts: Product[]) => {
    setProducts(prev => [...prev, ...newProducts]); 
    for (const p of newProducts) {
        await dataService.upsertProduct(p, currentUser?.companyId);
    }
    if (currentUser?.companyId) {
        const fresh = await dataService.getProducts(currentUser.companyId);
        setProducts(fresh);
    }
  }, [currentUser]);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    await dataService.deleteProduct(id);
  }, []);

  const upsertContact = useCallback(async (contact: Contact) => {
    setContacts(prev => {
      const exists = prev.find(c => c.id === contact.id);
      return exists ? prev.map(c => c.id === contact.id ? contact : c) : [...prev, contact];
    });
    await dataService.upsertContact(contact, currentUser?.companyId);
    if (currentUser?.companyId) {
        const fresh = await dataService.getContacts(currentUser.companyId);
        setContacts(fresh);
    }
  }, [currentUser]);

  const deleteContact = async (id: string) => {
    if (id === 'c1' && !isSupabaseConfigured()) return alert('Varsayılan perakende cari silinemez.');
    setContacts(prev => prev.filter(c => c.id !== id));
    await dataService.deleteContact(id);
  };

  const handleLogout = () => {
    localStorage.removeItem('db_erp_user'); // Clear persistent session
    setCurrentUser(null);
    setOriginalAdmin(null);
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-white font-bold tracking-widest text-xs animate-pulse">SaaS VERİLERİ YÜKLENİYOR...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={currentUser.role} 
        onLogout={handleLogout} 
        isImpersonating={!!originalAdmin}
        onExitImpersonation={handleExitImpersonation}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {originalAdmin && (
            <div className="bg-orange-600 text-white px-4 py-2 text-xs font-bold text-center animate-pulse">
                DİKKAT: ŞU AN "{currentUser.name}" ADINA YÖNETİCİ GİRİŞİ YAPTINIZ. YAPILAN İŞLEMLER GERÇEKTİR.
            </div>
        )}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-black text-slate-800 capitalize tracking-tight flex items-center">
              <span className={`w-1 h-6 mr-3 rounded-full ${originalAdmin ? 'bg-orange-600' : 'bg-indigo-600'}`}></span>
              {activeTab === 'dashboard' && 'Yönetici Paneli Özet'}
              {activeTab === 'saas' && 'SaaS Süper Yönetim'}
              {activeTab === 'inventory' && 'Kurumsal Stok Yönetimi'}
              {activeTab === 'purchases' && 'Alım & Tedarik Zinciri'}
              {activeTab === 'sales' && 'Satış Operasyonları'}
              {activeTab === 'transactions' && 'Finansal İşlem Kayıtları'}
              {activeTab === 'contacts' && 'Müşteri & Tedarikçi Rehberi'}
            </h1>
            {!isSupabaseConfigured() && (
               <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded ml-4 font-bold">DEMO MODU</span>
            )}
            {isSupabaseConfigured() && currentUser.companyId && (
               <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded ml-4 font-bold">
                 {currentUser.role === UserRole.SUPER_ADMIN ? 'SÜPER ADMIN YETKİSİ' : `LIVE (${currentUser.companyId.substring(0,8)}...)`}
               </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right border-r border-gray-100 pr-4">
              <p className="text-sm font-bold text-gray-800 leading-tight">{currentUser.name}</p>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600">
                  {originalAdmin ? `(ASIL: ${originalAdmin.name})` : (currentUser.role === UserRole.SUPER_ADMIN ? 'DB TECH ADMIN' : currentUser.role)}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg border ${originalAdmin ? 'bg-orange-600 border-orange-400' : 'bg-indigo-600 border-indigo-400/20'}`}>
              {currentUser.name[0]}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === 'saas' && currentUser.role === UserRole.SUPER_ADMIN && (
              <SaaSManager onImpersonate={handleImpersonate} />
          )}
          {activeTab === 'dashboard' && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && (
            <Dashboard products={products} transactions={transactions} />
          )}
          {activeTab === 'inventory' && (
            <Inventory 
              products={products} 
              onUpsert={upsertProduct} 
              onBulkUpsert={bulkUpsertProducts}
              onDelete={deleteProduct} 
              userRole={currentUser.role}
            />
          )}
          {activeTab === 'purchases' && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PURCHASE || currentUser.role === UserRole.SUPER_ADMIN) && (
            <PurchaseModule products={products} contacts={contacts.filter(c => c.type === ContactType.SUPPLIER)} onAddTransaction={addTransaction} />
          )}
          {activeTab === 'sales' && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SALES || currentUser.role === UserRole.SUPER_ADMIN) && (
            <SalesModule products={products} contacts={contacts.filter(c => c.type === ContactType.CUSTOMER)} onAddTransaction={addTransaction} />
          )}
          {activeTab === 'transactions' && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) && (
            <Transactions transactions={transactions} />
          )}
          {activeTab === 'contacts' && (
            <ContactManager contacts={contacts} onUpsert={upsertContact} onDelete={deleteContact} userRole={currentUser.role} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
