
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Product, Contact, Transaction, User, UserRole, TransactionItem, TransactionType, Tenant, AuditLog, ContactType } from '../types';

class DataService {
  private useLive = isSupabaseConfigured();

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
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) return { success: false, error: error.message };
    await this.logAction(companyId, "Kullanıcı Silindi", `UserID: ${userId}`);
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
    if (!this.useLive) return { user: null, error: "Giriş sadece canlı modda aktiftir." };
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: username, password });
        if (error) return { user: null, error: error.message };
        if (data.user) {
          let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          if (!profile && data.user.email === 'odabasisuleyman2015@gmail.com') {
              const adminProfile = { id: data.user.id, full_name: 'Süleyman Odabaşı', role: 'DB_TECH_ADMIN', company_id: 'GLOBAL_HEAD', company_name: 'DB Tech Global' };
              await supabase.from('profiles').upsert(adminProfile);
              profile = adminProfile;
          }
          if (profile) {
              await this.logAction(profile.company_id, "Sisteme Giriş Yapıldı");
              return { user: { id: data.user.id, name: profile.full_name, username: data.user.email || '', role: profile.role as UserRole, companyId: profile.company_id }, error: null };
          }
        }
    } catch (err: any) { return { user: null, error: err.message }; }
    return { user: null, error: 'Hesap doğrulanamadı.' };
  }

  async getAllTenants(): Promise<Tenant[]> {
      if (!this.useLive) return [];
      const { data, error } = await supabase.from('tenants').select('*').neq('id', 'GLOBAL_HEAD');
      if (error) return [];
      return data.map((t: any) => ({ id: t.id, name: t.name, status: t.status, createdAt: t.created_at }));
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
      if (!this.useLive) return [];
      const { data, error } = await supabase.from('profiles').select('*').eq('company_id', tenantId);
      if (error) return [];
      return data.map((p: any) => ({ id: p.id, name: p.full_name, username: '', role: p.role as UserRole, companyId: p.company_id }));
  }

  async createTenantOnly(companyName: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Bağlantı yok" };
    const companyId = Math.random().toString(36).substring(2, 10);
    const { error } = await supabase.from('tenants').insert({ id: companyId, name: companyName, status: 'ACTIVE' });
    if (error) return { success: false, error: error.message };
    await this.logAction('GLOBAL_HEAD', "Yeni Şirket Oluşturuldu", companyName);
    return { success: true, error: null };
  }

  async deleteTenant(tenantId: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Bağlantı yok" };
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
    if (error) return { success: false, error: error.message };
    await this.logAction('GLOBAL_HEAD', "Şirket Silindi", tenantId);
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
    if (!this.useLive || !companyId) return [];
    const { data, error } = await supabase.from('products').select('*').eq('company_id', companyId);
    if (error) return [];
    return data.map((d: any) => ({ id: d.id, name: d.name, sku: d.sku, category: d.category, unit: d.unit, stock: Number(d.stock), criticalThreshold: Number(d.critical_threshold), pricing: typeof d.pricing === 'string' ? JSON.parse(d.pricing) : d.pricing, sellingPrice: Number(d.selling_price) }));
  }

  async upsertProduct(product: Product, companyId?: string): Promise<void> {
    if (!this.useLive || !companyId) return;
    const { error } = await supabase.from('products').upsert({ id: product.id, name: product.name, sku: product.sku, category: product.category, unit: product.unit, stock: product.stock, critical_threshold: product.criticalThreshold, selling_price: product.sellingPrice, pricing: product.pricing, company_id: companyId });
    if (!error) await this.logAction(companyId, "Stok Kartı Güncellendi", product.name);
  }

  async deleteProduct(id: string): Promise<void> {
      if (!this.useLive) return;
      const { data: prod } = await supabase.from('products').select('name, company_id').eq('id', id).single();
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error && prod) await this.logAction(prod.company_id, "Stok Kartı Silindi", prod.name);
  }

  async getContacts(companyId?: string): Promise<Contact[]> {
      if (!this.useLive || !companyId) return [];
      const { data, error } = await supabase.from('contacts').select('*').eq('company_id', companyId);
      if (error) return [];
      return data.map((c: any) => ({ id: c.id, name: c.name, type: c.type as ContactType, phone: c.phone, address: c.address }));
  }

  async upsertContact(contact: Contact, companyId?: string): Promise<void> {
      if (!this.useLive || !companyId) return;
      await supabase.from('contacts').upsert({ id: contact.id, name: contact.name, type: contact.type, phone: contact.phone, address: contact.address, company_id: companyId });
      await this.logAction(companyId, "Cari Kart Güncellendi", contact.name);
  }

  async deleteContact(id: string): Promise<void> {
      if (!this.useLive) return;
      const { data: contact } = await supabase.from('contacts').select('name, company_id').eq('id', id).single();
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (!error && contact) await this.logAction(contact.company_id, "Cari Kart Silindi", contact.name);
  }

  async getTransactions(companyId?: string): Promise<Transaction[]> {
      if (!this.useLive || !companyId) return [];
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
      if (!this.useLive || !companyId) return;
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
