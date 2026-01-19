
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Product, Contact, Transaction, User, UserRole, TransactionItem, TransactionType, Tenant } from '../types';

// Not: Demo verileri (INITIAL_PRODUCTS vb.) artık import edilmiyor.
// Satışa hazır versiyonda veritabanı esastır.

class DataService {
  private useLive = isSupabaseConfigured();

  // Bağlantı Testi
  async testConnection(): Promise<{ success: boolean; message: string; details?: string }> {
    if (!this.useLive) return { success: false, message: 'Supabase ayarları (.env) eksik.' };
    try {
      // Önce auth servisini kontrol et (En basit ping)
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw new Error("Auth Servisi Hatası: " + authError.message);

      // Sonra veritabanı tablosunu kontrol et
      const { error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
      
      if (error) {
          // Tablo yok hatası (42P01 - undefined_table) genellikle "relation ... does not exist" döner
          if (error.code === '42P01' || error.message.includes('does not exist')) {
              return { 
                  success: false, 
                  message: 'Tablolar Oluşturulmamış!', 
                  details: 'SQL Editor üzerinden veritabanı kurulum kodlarını çalıştırmanız gerekiyor.' 
              };
          }
          throw error;
      }
      return { success: true, message: 'Supabase Bağlantısı Başarılı! Sistem aktif.' };
    } catch (err: any) {
      console.error("Connection Check Failed:", err);
      // Ağ hatası veya proje duraklatılmış olabilir
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('network'))) {
          return { success: false, message: 'Ağ Bağlantı Hatası', details: 'İnternet bağlantınızı kontrol edin veya Supabase projesinin "Paused" (duraklatılmış) olmadığından emin olun.' };
      }
      return { success: false, message: 'Veritabanı Hatası: ' + err.message };
    }
  }

  async login(username: string, password: string): Promise<{ user: User | null, error: string | null }> {
    if (!this.useLive) {
        return { user: null, error: "Uygulama veritabanına bağlı değil. Lütfen .env dosyasını kontrol edin." };
    }

    try {
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
          // Eğer giriş yapan senin mail adresin ise ve profili yoksa, onu DB_TECH_ADMIN olarak oluştur.
          if (data.user.email === 'odabasisuleyman2015@gmail.com') {
              // Profil yoksa veya yetkisi admin değilse düzelt
              if (!profile || profile.role !== 'DB_TECH_ADMIN') {
                  console.log("Süper Admin (Süleyman Odabaşı) profili senkronize ediliyor...");
                  
                  const adminProfile = {
                      id: data.user.id,
                      full_name: 'Süleyman Odabaşı',
                      role: 'DB_TECH_ADMIN',
                      company_id: 'GLOBAL_HEAD',
                      company_name: 'DB Tech Global'
                  };

                  const { error: upsertError } = await supabase.from('profiles').upsert(adminProfile);
                  if (!upsertError) {
                      profile = adminProfile;
                  } else {
                      console.error("Admin oluşturma hatası:", upsertError);
                      // Profil tablosu yoksa bu hatayı döner, kullanıcıya bildir.
                      if (upsertError.message.includes('does not exist')) {
                          return { user: null, error: "Veritabanı tabloları eksik. Lütfen SQL kodlarını çalıştırın." };
                      }
                  }
              }
          }

          if (!profile) {
              // Profil yoksa (RLS engelliyor olabilir veya tablo bozuktur)
              if (profileError) {
                  console.error("Profil Çekme Hatası:", profileError);
                  if (profileError.code === 'PGRST116') {
                       return { user: null, error: "Kullanıcı hesabınız var ancak profil kaydınız eksik. Yöneticinize başvurun." };
                  }
              }
              return { user: null, error: "Kullanıcı profili bulunamadı." };
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
    } catch (err: any) {
        console.error("Login System Error:", err);
        return { user: null, error: "Sistem hatası: " + err.message };
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
