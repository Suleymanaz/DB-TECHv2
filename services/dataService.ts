
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Product, Contact, Transaction, User, UserRole, TransactionItem, TransactionType, Tenant } from '../types';

class DataService {
  private useLive = isSupabaseConfigured();

  // Gelişmiş Bağlantı Testi
  async testConnection(): Promise<{ success: boolean; message: string; details?: string }> {
    if (!this.useLive) return { success: false, message: 'Supabase ayarları (.env) eksik.' };
    
    try {
      // 1. ADIM: Sunucuya ulaşılabiliyor mu? (Auth Servisi)
      const { error: authError } = await supabase.auth.getSession();
      if (authError) {
          throw new Error("Auth Servisi Hatası: " + (authError.message || "Erişim Reddedildi"));
      }

      // 2. ADIM: Tenants tablosuna erişim var mı?
      // Public okuma izni verdiğimiz için bu sorgu çalışmalı.
      const { error: tableError } = await supabase.from('tenants').select('id').limit(1);
      
      if (tableError) {
          console.error("Tablo Hatası Detay:", tableError);
          
          if (tableError.code === '42P01' || tableError.message?.includes('does not exist')) {
             return { 
                 success: false, 
                 message: 'Tablo Bulunamadı', 
                 details: 'Veritabanı tabloları eksik. Lütfen verilen "db_setup.sql" dosyasını SQL Editor\'de çalıştırın.' 
             };
          }

          if (tableError.code === '42501' || tableError.message?.includes('permission denied')) {
             return { 
                 success: false, 
                 message: 'Erişim İzni Yok (Grants Missing)', 
                 details: 'Tablo izinleri eksik. Lütfen güncellenmiş "db_setup.sql" dosyasını SQL Editor\'de çalıştırın.' 
             };
          }
          
          return { success: false, message: 'Veri Erişim Hatası', details: tableError.message };
      }

      return { success: true, message: 'Bağlantı Başarılı!', details: 'Veritabanı ve tablolar hazır.' };

    } catch (err: any) {
      console.error("Genel Bağlantı Hatası:", err);
      return { success: false, message: 'Bağlantı Hatası', details: err.message || 'Bilinmeyen hata' };
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
          // Giriş başarılı, şimdi profili çekelim.
          let userRole = UserRole.ADMIN; // Varsayılan
          let companyId = '';

          // 1. Profil kontrolü
          let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          // 2. Profil yoksa ve Süper Admin adayı ise (Bootstrap)
          // Veya profil yoksa ama giriş yaptıysa (SignUp sonrası ilk giriş)
          if (!profile) {
              // Süper Admin Kontrolü
              if (data.user.email === 'odabasisuleyman2015@gmail.com') {
                  console.log("Süper Admin profili oluşturuluyor...");
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
                      return { user: null, error: "Profil oluşturulamadı (SQL RLS Hatası Olabilir): " + upsertError.message };
                  }
              } else {
                  // Normal kullanıcı ama profili yok (Manuel DB müdahalesi veya hata)
                  return { user: null, error: "Kullanıcı hesabınız var ancak yetki profiliniz bulunamadı. Yöneticinize başvurun." };
              }
          }

          if (profile) {
              return {
                user: {
                  id: data.user.id,
                  name: profile.full_name || username,
                  username: data.user.email || '',
                  role: profile.role as UserRole, 
                  companyId: profile.company_id
              },
                error: null
              };
          }
        }
    } catch (err: any) {
        console.error("Login System Error:", err);
        return { user: null, error: "Sistem hatası: " + err.message };
    }
    
    return { user: null, error: 'Giriş başarısız.' };
  }

  // --- SAAS Methods ---

  async getAllTenants(): Promise<Tenant[]> {
      if (!this.useLive) return [];
      // Sadece GLOBAL_HEAD olmayanları getir
      const { data, error } = await supabase.from('tenants').select('*').neq('id', 'GLOBAL_HEAD');
      if (error) { console.error("Get Tenants Error:", error); return []; }
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

    // Cascade silme SQL'de tanımlı olsa da, profil tablosunu da temizlemeyi deneyelim.
    // Ancak RLS yüzünden sadece Admin yapabilir.
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  }

  async createUserForTenant(tenantId: string, tenantName: string, email: string, pass: string, name: string, role: UserRole): Promise<{ success: boolean, error: string | null }> {
      if (!this.useLive) return { success: false, error: "Bağlantı yok" };

      // NOT: Client-side signUp mevcut oturumu kapatır.
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
          // Profil tablosuna ekle
          // Yeni SQL politikalarımızda "Insert Own" yetkisi var.
          // Ancak burada signUp yapan kişi (admin) başkası adına profil oluşturmaya çalışırsa RLS engelleyebilir mi?
          // SQL'deki "Profiles Insert Own or Admin" politikası sayesinde Admin ekleyebilir.
          
          const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              full_name: name,
              role: role,
              company_id: tenantId,
              company_name: tenantName
          });
          
          if (profileError) {
              console.error("Profil oluşturma hatası:", profileError);
              return { success: false, error: "Kullanıcı Auth'a eklendi ama Profil tablosuna yazılamadı: " + profileError.message };
          }
      }

      return { success: true, error: null };
  }

  // --- DATA METHODS (CRUD) ---

  async getProducts(companyId?: string): Promise<Product[]> {
    if (!this.useLive || !companyId) return [];
    
    // RLS zaten filtreler ama güvenlik için company_id ekleyelim
    const { data, error } = await supabase.from('products').select('*').eq('company_id', companyId);
    
    if (error) {
        console.error("Ürün Çekme Hatası:", error);
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
        pricing: typeof d.pricing === 'string' ? JSON.parse(d.pricing) : d.pricing,
        sellingPrice: Number(d.selling_price)
    }));
  }

  async upsertProduct(product: Product, companyId?: string): Promise<void> {
    if (!this.useLive || !companyId) return;

    // Yeni kayıt mı güncelleme mi?
    const productData = {
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        stock: product.stock,
        critical_threshold: product.criticalThreshold,
        selling_price: product.sellingPrice,
        pricing: product.pricing,
        company_id: companyId
    };

    let query = supabase.from('products');

    // ID varsa upsert, yoksa insert (ID'yi supabase oluşturmaz, biz client'ta oluşturup gönderiyorsak upsert uygundur)
    // Client tarafında yeni ürünlere ID atıyor musunuz? Evet App.tsx'de atılıyor.
    
    const { error } = await query.upsert({
        ...productData,
        id: product.id
    });

    if (error) console.error("Ürün Kayıt Hatası:", error);
  }

  async deleteProduct(id: string): Promise<void> {
      if (!this.useLive) return;
      await supabase.from('products').delete().eq('id', id);
  }

  async getContacts(companyId?: string): Promise<Contact[]> {
      if (!this.useLive || !companyId) return [];
      const { data, error } = await supabase.from('contacts').select('*').eq('company_id', companyId);
      if (error) return [];
      return data.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          phone: c.phone,
          address: c.address
      }));
  }

  async upsertContact(contact: Contact, companyId?: string): Promise<void> {
      if (!this.useLive || !companyId) return;
      await supabase.from('contacts').upsert({
          id: contact.id,
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
      const { data, error } = await supabase.from('transactions').select('*').eq('company_id', companyId).order('date', { ascending: false });
      if (error) return [];
      return data.map((t: any) => ({
          id: t.id,
          items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
          type: t.type as TransactionType,
          contactId: t.contact_id,
          contactName: t.contact_name,
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
          total_amount: tx.totalAmount,
          date: tx.date,
          user_name: tx.user,
          is_return: tx.isReturn
      });

      if (error) {
          console.error("İşlem Kaydetme Hatası:", error);
          return;
      }

      // Stokları güncelle (Trigger yerine Client-side yapıyoruz şimdilik, trigger daha güvenlidir ama SQL karmaşası yaratmayalım)
      // Ancak App.tsx state'i güncelliyor. DB'yi de güncellemeliyiz.
      // Toplu işlem için Promise.all
      const updates = tx.items.map(async (item) => {
          if (!item.isLabor && item.productId) {
               // Mevcut stoğu çekmemiz lazım (concurrency issue olabilir ama basit ERP için ok)
               const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
               if (prod) {
                   const change = tx.type === TransactionType.IN ? item.quantity : -item.quantity;
                   const newStock = Number(prod.stock) + change;
                   await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
               }
          }
      });
      
      await Promise.all(updates);
  }
}

export const dataService = new DataService();
