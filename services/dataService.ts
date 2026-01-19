
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Product, Contact, Transaction, User, UserRole, TransactionItem, TransactionType, Tenant } from '../types';

// Not: Demo verileri (INITIAL_PRODUCTS vb.) artık import edilmiyor.
// Satışa hazır versiyonda veritabanı esastır.

class DataService {
  private useLive = isSupabaseConfigured();

  // Bağlantı Testi
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.useLive) return { success: false, message: 'Supabase ayarları (.env) eksik.' };
    try {
      const { error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
      if (error) throw error;
      return { success: true, message: 'Supabase Bağlantısı Başarılı! Sistem aktif.' };
    } catch (err: any) {
      return { success: false, message: 'Bağlantı Hatası: ' + err.message };
    }
  }

  async login(username: string, password: string): Promise<{ user: User | null, error: string | null }> {
    if (!this.useLive) {
        return { user: null, error: "Uygulama veritabanına bağlı değil. Lütfen .env dosyasını kontrol edin." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error) return { user: null, error: error.message };
    
    if (data.user) {
      // 1. Profil tablosundan veriyi çekmeye çalış
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // 2. SÜPER ADMIN KURTARMA (Bootstrap)
      // Eğer giriş yapan 'admin@dbtech.com' ise ve profili yoksa veya bozuksa, onu DB_TECH_ADMIN olarak oluştur.
      if (data.user.email === 'admin@dbtech.com') {
          if (!profile || profile.role !== 'DB_TECH_ADMIN') {
              console.log("Süper Admin başlatılıyor...");
              
              // Profil kaydını güncelle/oluştur
              const adminProfile = {
                  id: data.user.id,
                  full_name: 'DB Tech Kurucu',
                  role: 'DB_TECH_ADMIN',
                  company_id: 'GLOBAL_HEAD',
                  company_name: 'DB Tech Global'
              };

              const { error: upsertError } = await supabase.from('profiles').upsert(adminProfile);
              if (!upsertError) {
                  profile = adminProfile;
              } else {
                  console.error("Admin oluşturma hatası:", upsertError);
              }
          }
      }

      if (!profile) {
          return { user: null, error: "Kullanıcı profili bulunamadı. Sistem yöneticinizle görüşün." };
      }

      return {
        user: {
          id: data.user.id,
          name: profile.full_name,
          username: data.user.email || '',
          role: profile.role as UserRole, 
          companyId: profile.company_id
        },
        error: null
      };
    }
    
    return { user: null, error: 'Giriş başarısız.' };
  }

  // SAAS Methods

  async getAllTenants(): Promise<Tenant[]> {
      if (!this.useLive) return [];
      // GLOBAL_HEAD hariç diğer firmaları getir
      const { data, error } = await supabase.from('tenants').select('*').neq('id', 'GLOBAL_HEAD');
      if (error) { console.error(error); return []; }
      return data.map((t: any) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          createdAt: t.created_at
      }));
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
      if (!this.useLive) return [];
      const { data, error } = await supabase.from('profiles').select('*').eq('company_id', tenantId);
      if (error) { console.error(error); return []; }
      return data.map((p: any) => ({
          id: p.id,
          name: p.full_name,
          username: '', 
          role: p.role as UserRole,
          companyId: p.company_id
      }));
  }

  async createTenantOnly(companyName: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Bağlantı yok" };

    const companyId = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const { error } = await supabase.from('tenants').insert({
        id: companyId,
        name: companyName,
        status: 'ACTIVE'
    });

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  }

  async deleteTenant(tenantId: string): Promise<{ success: boolean, error: string | null }> {
    if (!this.useLive) return { success: false, error: "Bağlantı yok" };
    if (tenantId === 'GLOBAL_HEAD') return { success: false, error: "Ana şirket silinemez!" };

    // Önce kullanıcıları Auth'dan silmemiz gerekir ama Supabase Client tarafında admin yetkisi kısıtlıdır.
    // Bu yüzden şimdilik sadece tablodan siliyoruz. Gerçek production ortamında Edge Function kullanılır.
    
    // Profilleri sil (Cascade çalışır ama emin olalım)
    await supabase.from('profiles').delete().eq('company_id', tenantId);

    // Şirketi sil
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  }

  async createUserForTenant(tenantId: string, tenantName: string, email: string, pass: string, name: string, role: UserRole): Promise<{ success: boolean, error: string | null }> {
      if (!this.useLive) return { success: false, error: "Bağlantı yok" };

      const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
              data: {
                  full_name: name,
                  role: role,
                  company_id: tenantId
              }
          }
      });

      if (error) return { success: false, error: error.message };
      
      if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              full_name: name,
              role: role,
              company_id: tenantId,
              company_name: tenantName
          });
          if (profileError) return { success: false, error: "Kullanıcı oluştu ama profil hatası: " + profileError.message };
      }

      return { success: true, error: null };
  }

  // --- DATA METHODS (CRUD) ---
  // Artık LocalStorage kullanılmıyor. Veritabanı boşsa boş döner.

  async getProducts(companyId?: string): Promise<Product[]> {
    if (!this.useLive || !companyId) return [];
    
    const { data } = await supabase.from('products').select('*').eq('company_id', companyId);
    if (!data) return [];
    
    return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        sku: d.sku,
        category: d.category,
        unit: d.unit,
        stock: Number(d.stock),
        criticalThreshold: Number(d.critical_threshold),
        pricing: typeof d.pricing === 'string' ? JSON.parse(d.pricing) : d.pricing,
        sellingPrice: Number(d.selling_price)
    }));
  }

  async upsertProduct(product: Product, companyId?: string): Promise<void> {
    if (!this.useLive || !companyId) return;

    await supabase.from('products').upsert({
        id: product.id.length < 10 ? undefined : product.id, // Yeni ürünse ID'yi Supabase üretsin
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        stock: product.stock,
        critical_threshold: product.criticalThreshold,
        selling_price: product.sellingPrice,
        pricing: product.pricing,
        company_id: companyId
    });
  }

  async deleteProduct(id: string): Promise<void> {
    if (!this.useLive) return;
    await supabase.from('products').delete().eq('id', id);
  }

  async getContacts(companyId?: string): Promise<Contact[]> {
      if (!this.useLive || !companyId) return [];
      
      const { data } = await supabase.from('contacts').select('*').eq('company_id', companyId);
      if (!data) return [];
      
      return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          phone: d.phone,
          address: d.address
      }));
  }

  async upsertContact(contact: Contact, companyId?: string): Promise<void> {
      if (!this.useLive || !companyId) return;

      await supabase.from('contacts').upsert({
          id: contact.id.length < 5 ? undefined : contact.id,
          name: contact.name,
          type: contact.type,
          phone: contact.phone,
          address: contact.address,
          company_id: companyId
      });
  }

  async deleteContact(id: string): Promise<void> {
      if (!this.useLive) return;
      await supabase.from('contacts').delete().eq('id', id);
  }

  async getTransactions(companyId?: string): Promise<Transaction[]> {
      if (!this.useLive || !companyId) return [];

      const { data } = await supabase.from('transactions').select('*').eq('company_id', companyId).order('date', { ascending: false });
      if (!data) return [];
      
      return data.map((d: any) => ({
          id: d.id,
          items: typeof d.items === 'string' ? JSON.parse(d.items) : d.items,
          type: d.type,
          contactId: d.contact_id,
          contactName: d.contact_name,
          totalAmount: Number(d.total_amount),
          date: d.date,
          user: d.user_name,
          isReturn: d.is_return
      }));
  }

  async saveTransaction(tx: Transaction, companyId?: string): Promise<void> {
      if (!this.useLive || !companyId) return;

      await supabase.from('transactions').insert({
          items: tx.items,
          type: tx.type,
          contact_id: tx.contactId,
          contact_name: tx.contactName,
          total_amount: tx.totalAmount,
          date: tx.date,
          user_name: tx.user,
          is_return: tx.isReturn,
          company_id: companyId
      });
      
      // Stok güncelleme
      for (const item of tx.items) {
         if (item.productId && !item.isLabor) {
             // Mevcut stoku çek
             const { data: currentProd } = await supabase.from('products').select('stock').eq('id', item.productId).single();
             if (currentProd) {
                 const change = tx.type === TransactionType.IN ? item.quantity : -item.quantity;
                 const newStock = Number(currentProd.stock) + change;
                 await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
             }
         }
      }
  }
}

export const dataService = new DataService();
