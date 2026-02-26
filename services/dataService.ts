
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Product, Contact, Transaction, User, UserRole, TransactionType, Tenant, AuditLog, ContactType, Expense } from '../types';

class DataService {
  private useLive = isSupabaseConfigured();

  async getExpenses(companyId?: string): Promise<Expense[]> {
      if (!this.useLive || !companyId) {
          const local = localStorage.getItem(`db_erp_expenses_${companyId || 'demo'}`);
          return local ? JSON.parse(local) : [];
      }
      const { data, error } = await supabase.from('expenses').select('*').eq('company_id', companyId).order('date', { ascending: false });
      if (error) return [];
      return data.map((e: any) => ({
          id: e.id,
          companyId: e.company_id,
          category: e.category,
          amount: Number(e.amount),
          description: e.description,
          date: e.date,
          user_name: e.user_name
      }));
  }

  async saveExpense(expense: Expense): Promise<void> {
      if (!this.useLive) {
          const expenses = await this.getExpenses(expense.companyId);
          localStorage.setItem(`db_erp_expenses_${expense.companyId}`, JSON.stringify([expense, ...expenses]));
          return;
      }
      const { error } = await supabase.from('expenses').insert({
          id: expense.id,
          company_id: expense.companyId,
          category: expense.category,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          user_name: expense.user_name
      });
      if (!error) await this.logAction(expense.companyId, "Gider Kaydı Eklendi", `${expense.category}: ${expense.amount} TL`);
  }

  async deleteExpense(id: string, companyId: string): Promise<void> {
      if (!this.useLive) {
          const expenses = await this.getExpenses(companyId);
          localStorage.setItem(`db_erp_expenses_${companyId}`, JSON.stringify(expenses.filter(e => e.id !== id)));
          return;
      }
      await supabase.from('expenses').delete().eq('id', id);
      await this.logAction(companyId, "Gider Kaydı Silindi", `ID: ${id}`);
  }

  async logAction(companyId: string, action: string, details: string = '') {
    if (!this.useLive) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      await supabase.from('audit_logs').insert({
        company_id: companyId,
        user_id: user.id,
        user_name: profile?.full_name || 'Bilinmeyen Kullanıcı',
        action,
        details
      });
    } catch (e) { console.error("Log hatası:", e); }
  }

  async getAuditLogs(companyId: string, startDate?: string, endDate?: string): Promise<AuditLog[]> {
    if (!this.useLive) return [];
    let query = supabase.from('audit_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { data, error } = await query;
    if (error) return [];
    return data as AuditLog[];
  }

  async updateUserRole(userId: string, newRole: UserRole, companyId: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Canlı bağlantı yok" };
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) return { success: false, error: error.message };
    await this.logAction(companyId, "Kullanıcı Rolü Değiştirildi", `UserID: ${userId}, Yeni Rol: ${newRole}`);
    return { success: true, error: null };
  }

  async deleteUser(userId: string, companyId: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Canlı bağlantı yok" };
    const { error } = await supabase.rpc('delete_user_hard', { target_user_id: userId });
    if (error) return { success: false, error: error.message };
    await this.logAction(companyId, "Kullanıcı Kalıcı Olarak Silindi (Auth Dahil)", `UserID: ${userId}`);
    return { success: true, error: null };
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: string }> {
    if (!this.useLive) return { success: false, message: 'Supabase ayarları (.env) eksik.' };
    try {
      const { error: authError } = await supabase.auth.getSession();
      if (authError) throw new Error("Auth Servisi Hatası: " + (authError.message || "Erişim Reddedildi"));
      const { error: tableError } = await supabase.from('tenants').select('id').limit(1);
      if (tableError) {
          if (tableError.code === '42P01') return { success: false, message: 'Tablo Bulunamadı', details: 'Lütfen db_setup.sql çalıştırın.' };
          if (tableError.code === '42501') return { success: false, message: 'Erişim İzni Yok', details: 'Grant izinleri eksik.' };
          return { success: false, message: 'Veri Erişim Hatası', details: tableError.message };
      }
      return { success: true, message: 'Bağlantı Başarılı!', details: 'Veritabanı hazır.' };
    } catch (err: any) { return { success: false, message: 'Bağlantı Hatası', details: err.message || 'Bilinmeyen hata' }; }
  }

  async login(username: string, password: string): Promise<{ user: User | null, error: string | null }> {
    if (!this.useLive) {
        if (username === 'admin' && password === 'admin') {
            return {
                user: {
                    id: 'demo-user',
                    name: 'Demo Yönetici',
                    username: 'admin',
                    role: UserRole.ADMIN,
                    companyId: 'demo-company',
                    companyName: 'Demo Şirket'
                },
                error: null
            };
        }
        return { user: null, error: "Demo girişi için admin/admin kullanın." };
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: username, password });
        if (error) return { user: null, error: error.message };
        if (data.user) {
          let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          if (profile) {
              await this.logAction(profile.company_id, "Sisteme Giriş Yapıldı");
              return { 
                user: { 
                  id: data.user.id, 
                  name: profile.full_name, 
                  username: data.user.email || '', 
                  role: profile.role as UserRole, 
                  companyId: profile.company_id,
                  companyName: profile.company_name
                }, 
                error: null 
              };
          }
        }
    } catch (err: any) { return { user: null, error: err.message }; }
    return { user: null, error: 'Hesap doğrulanamadı.' };
  }

  async getAllTenants(): Promise<Tenant[]> {
      if (!this.useLive) return [];
      const { data, error } = await supabase.from('tenants').select('*').neq('id', 'GLOBAL_HEAD');
      if (error) return [];
      return data.map((t: any) => ({ 
        id: t.id, 
        name: t.name, 
        status: t.status, 
        createdAt: t.created_at,
        categories: t.categories || [],
        units: t.units || []
      }));
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
      if (!this.useLive) {
          const local = localStorage.getItem(`db_erp_tenant_${tenantId}`);
          if (local) return JSON.parse(local);
          return {
              id: tenantId,
              name: 'Demo Şirket',
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              categories: ['Genel Ürünler', 'Sarf Malzeme', 'Ticari Mal', 'Diğer'],
              units: ['Adet', 'Metre', 'Kg', 'Paket', 'Litre']
          };
      }
      const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (error) return null;
      return { 
        id: data.id, 
        name: data.name, 
        status: data.status, 
        createdAt: data.created_at,
        categories: data.categories || [],
        units: data.units || []
      };
  }

  async updateTenantConfig(tenantId: string, categories: string[], units: string[]): Promise<boolean> {
      if (!this.useLive) {
          const tenant = await this.getTenant(tenantId);
          if (tenant) {
              const updated = { ...tenant, categories, units };
              localStorage.setItem(`db_erp_tenant_${tenantId}`, JSON.stringify(updated));
              return true;
          }
          return false;
      }
      const { error } = await supabase.from('tenants').update({ categories, units }).eq('id', tenantId);
      if (!error) await this.logAction(tenantId, "Şirket Konfigürasyonu Güncellendi", `Kategoriler: ${categories.length}, Birimler: ${units.length}`);
      return !error;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
      if (!this.useLive) return [];
      const { data, error } = await supabase.from('profiles').select('*').eq('company_id', tenantId);
      if (error) return [];
      return data.map((p: any) => ({ 
        id: p.id, 
        name: p.full_name, 
        username: '', 
        role: p.role as UserRole, 
        companyId: p.company_id,
        companyName: p.company_name
      }));
  }

  async createTenantOnly(companyName: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Bağlantı yok" };
    const companyId = Math.random().toString(36).substring(2, 10);
    const { error } = await supabase.from('tenants').insert({ 
      id: companyId, 
      name: companyName, 
      status: 'ACTIVE',
      categories: ['Genel Ürünler', 'Sarf Malzeme', 'Ticari Mal', 'Diğer'],
      units: ['Adet', 'Metre', 'Kg', 'Paket', 'Litre']
    });
    if (error) return { success: false, error: error.message };
    await this.logAction('GLOBAL_HEAD', "Yeni Şirket Oluşturuldu", companyName);
    return { success: true, error: null };
  }

  async deleteTenant(tenantId: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Bağlantı yok" };
    const { error = null } = await supabase.rpc('delete_tenant_hard', { target_tenant_id: tenantId });
    if (error) return { success: false, error: error.message };
    await this.logAction('GLOBAL_HEAD', "Şirket ve Bağlı Tüm Veriler Silindi", tenantId);
    return { success: true, error: null };
  }

  async createUserForTenant(tenantId: string, tenantName: string, email: string, pass: string, name: string, role: UserRole): Promise<{ success: boolean, error: string | null }> {
      if (!this.useLive) return { success: false, error: "Bağlantı yok" };
      const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { full_name: name, role: role, company_id: tenantId } } });
      if (error) return { success: false, error: error.message };
      if (data.user) {
          await supabase.from('profiles').insert({ id: data.user.id, full_name: name, role: role, company_id: tenantId, company_name: tenantName });
          await this.logAction(tenantId, "Yeni Kullanıcı Eklendi", `${name} (${role})`);
      }
      return { success: true, error: null };
  }

  async getProducts(companyId?: string): Promise<Product[]> {
    if (!this.useLive || !companyId) {
      const local = localStorage.getItem(`db_erp_products_${companyId || 'demo'}`);
      return local ? JSON.parse(local) : [];
    }
    const { data, error } = await supabase.from('products').select('*').eq('company_id', companyId);
    if (error) {
      console.error("Ürün çekme hatası:", error);
      return [];
    }
    return data.map((d: any) => ({ 
      id: d.id, 
      name: d.name, 
      sku: d.sku, 
      category: d.category, 
      unit: d.unit, 
      stock: Number(d.stock), 
      criticalThreshold: Number(d.critical_threshold), 
      pricing: {
        purchasePrice: Number(d.purchase_price || 0),
        vatRate: Number(d.vat_rate || 0.20),
        exchangeRate: Number(d.exchange_rate || 1),
        otherExpenses: Number(d.other_expenses || 0)
      }, 
      sellingPrice: Number(d.selling_price) 
    }));
  }

  async upsertProduct(product: Product, companyId?: string): Promise<void> {
    if (!this.useLive || !companyId) {
      const products = await this.getProducts(companyId);
      const exists = products.find(p => p.id === product.id);
      const updated = exists ? products.map(p => p.id === product.id ? product : p) : [...products, product];
      localStorage.setItem(`db_erp_products_${companyId || 'demo'}`, JSON.stringify(updated));
      return;
    }
    const { error } = await supabase.from('products').upsert({ 
      id: product.id, 
      name: product.name, 
      sku: product.sku, 
      category: product.category, 
      unit: product.unit, 
      stock: product.stock, 
      critical_threshold: product.criticalThreshold, 
      selling_price: product.sellingPrice, 
      purchase_price: product.pricing.purchasePrice,
      vat_rate: product.pricing.vatRate,
      exchange_rate: product.pricing.exchangeRate,
      other_expenses: product.pricing.otherExpenses,
      company_id: companyId 
    });
    if (error) {
      console.error("Ürün kaydetme hatası:", error);
      throw new Error("Ürün kaydedilemedi: " + error.message);
    }
    await this.logAction(companyId, "Stok Kartı Güncellendi", product.name);
  }

  async bulkUpsertProducts(products: Product[], companyId?: string): Promise<void> {
    if (!companyId) return;
    if (!this.useLive) {
      const existing = await this.getProducts(companyId);
      const updated = [...existing, ...products];
      localStorage.setItem(`db_erp_products_${companyId}`, JSON.stringify(updated));
      return;
    }
    const payload = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      stock: p.stock,
      critical_threshold: p.criticalThreshold,
      selling_price: p.sellingPrice,
      purchase_price: p.pricing.purchasePrice,
      vat_rate: p.pricing.vatRate,
      exchange_rate: p.pricing.exchangeRate,
      other_expenses: p.pricing.otherExpenses,
      company_id: companyId
    }));
    const { error } = await supabase.from('products').upsert(payload);
    if (error) {
      console.error("Toplu ürün yükleme hatası:", error);
      throw new Error("Toplu yükleme başarısız: " + error.message);
    }
    await this.logAction(companyId, "Toplu Stok Yükleme Yapıldı", `${products.length} ürün`);
  }

  async deleteProduct(id: string): Promise<void> {
      if (!this.useLive) return;
      const { data: prod } = await supabase.from('products').select('name, company_id').eq('id', id).single();
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error && prod) await this.logAction(prod.company_id, "Stok Kartı Silindi", prod.name);
  }

  async getContacts(companyId?: string): Promise<Contact[]> {
      if (!this.useLive || !companyId) {
          const local = localStorage.getItem(`db_erp_contacts_${companyId || 'demo'}`);
          return local ? JSON.parse(local) : [];
      }
      const { data, error } = await supabase.from('contacts').select('*').eq('company_id', companyId);
      if (error) return [];
      return data.map((c: any) => ({ id: c.id, name: c.name, type: c.type as ContactType, phone: c.phone, address: c.address }));
  }

  async upsertContact(contact: Contact, companyId?: string): Promise<void> {
      if (!this.useLive || !companyId) {
          const contacts = await this.getContacts(companyId);
          const exists = contacts.find(c => c.id === contact.id);
          const updated = exists ? contacts.map(c => c.id === contact.id ? contact : c) : [...contacts, contact];
          localStorage.setItem(`db_erp_contacts_${companyId || 'demo'}`, JSON.stringify(updated));
          return;
      }
      await supabase.from('contacts').upsert({ id: contact.id, name: contact.name, type: contact.type, phone: contact.phone, address: contact.address, company_id: companyId });
      await this.logAction(companyId, "Cari Kart Güncellendi", contact.name);
  }

  async deleteContact(id: string): Promise<void> {
      if (!this.useLive) {
          // Note: companyId is not passed here, so we'd need to handle it differently or assume demo
          const localKeys = Object.keys(localStorage).filter(k => k.startsWith('db_erp_contacts_'));
          localKeys.forEach(key => {
              const contacts = JSON.parse(localStorage.getItem(key) || '[]');
              localStorage.setItem(key, JSON.stringify(contacts.filter((c: any) => c.id !== id)));
          });
          return;
      }
      const { data: contact } = await supabase.from('contacts').select('name, company_id').eq('id', id).single();
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (!error && contact) await this.logAction(contact.company_id, "Cari Kart Silindi", contact.name);
  }

  async getTransactions(companyId?: string): Promise<Transaction[]> {
      if (!this.useLive || !companyId) {
          const local = localStorage.getItem(`db_erp_transactions_${companyId || 'demo'}`);
          return local ? JSON.parse(local) : [];
      }
      const { data, error } = await supabase.from('transactions').select('*').eq('company_id', companyId).order('date', { ascending: false });
      if (error) return [];
      return data.map((t: any) => ({ 
        id: t.id, 
        items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items, 
        type: t.type as TransactionType, 
        contactId: t.contact_id, 
        contactName: t.contact_name, 
        subtotal: Number(t.subtotal || 0),
        totalDiscount: Number(t.total_discount || 0),
        totalAmount: Number(t.total_amount), 
        date: t.date, 
        user: t.user_name, 
        isReturn: t.is_return 
      }));
  }

  async saveTransaction(tx: Transaction, companyId?: string): Promise<void> {
      if (!this.useLive || !companyId) {
          const transactions = await this.getTransactions(companyId);
          localStorage.setItem(`db_erp_transactions_${companyId || 'demo'}`, JSON.stringify([tx, ...transactions]));
          return;
      }
      const { error } = await supabase.from('transactions').insert({ 
        id: tx.id, 
        company_id: companyId, 
        items: tx.items, 
        type: tx.type, 
        contact_id: tx.contactId, 
        contact_name: tx.contactName, 
        subtotal: tx.subtotal,
        total_discount: tx.totalDiscount,
        total_amount: tx.totalAmount, 
        date: tx.date, 
        user_name: tx.user, 
        is_return: tx.isReturn 
      });
      if (!error) {
          await this.logAction(companyId, tx.isReturn ? "İade İşlemi" : (tx.type === TransactionType.IN ? "Mal Alımı" : "Satış İşlemi"), `Tutar: ${tx.totalAmount} TL`);
          for (const item of tx.items) {
              if (!item.isLabor && item.productId) {
                  const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
                  if (prod) {
                      const change = tx.type === TransactionType.IN ? item.quantity : -item.quantity;
                      await supabase.from('products').update({ stock: Number(prod.stock) + change }).eq('id', item.productId);
                  }
              }
          }
      }
  }
}

export const dataService = new DataService();
