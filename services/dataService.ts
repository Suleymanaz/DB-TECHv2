import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { Product, Contact, Transaction, User, UserRole, TransactionItem, TransactionType, Tenant } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CONTACTS, SYSTEM_USERS } from '../constants';

class DataService {
  private useLive = isSupabaseConfigured();

  // Bağlantı Testi
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.useLive) return { success: false, message: 'Supabase ayarları (.env) eksik.' };
    try {
      const { error } = await supabase.from('tenants').select('count', { count: 'exact', head: true });
      if (error) throw error;
      return { success: true, message: 'Supabase Bağlantısı Başarılı! Veritabanına erişilebiliyor.' };
    } catch (err: any) {
      return { success: false, message: 'Bağlantı Hatası: ' + err.message };
    }
  }

  async login(username: string, password: string): Promise<{ user: User | null, error: string | null }> {
    if (this.useLive) {
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

        // 2. OTOMATİK ONARIM (AUTO-HEAL)
        // Eğer giriş yapan kişi 'admin@dbtech.com' ise ve profili yoksa veya yetkisi eksikse, onu o an Süper Admin yap.
        if ((!profile || profileError) && data.user.email === 'admin@dbtech.com') {
            console.log("Süper Admin profili bulunamadı, otomatik oluşturuluyor...");
            
            // Önce Global Tenant var mı emin ol
            await supabase.from('tenants').insert({id: 'GLOBAL_HEAD', name: 'DB Tech Global', status: 'ACTIVE'}).select();

            const newProfile = {
                id: data.user.id,
                full_name: 'DB Tech Kurucu',
                role: 'DB_TECH_ADMIN',
                company_id: 'GLOBAL_HEAD',
                company_name: 'DB Tech Global'
            };

            const { error: insertError } = await supabase.from('profiles').upsert(newProfile);
            
            if (!insertError) {
                profile = newProfile; // Onarım başarılı, profili güncelle
            } else {
                console.error("Otomatik onarım başarısız:", insertError);
            }
        }

        return {
          user: {
            id: data.user.id,
            name: profile?.full_name || data.user.email?.split('@')[0] || 'Kullanıcı',
            username: data.user.email || '',
            role: (profile?.role as UserRole) || UserRole.ADMIN, 
            companyId: profile?.company_id
          },
          error: null
        };
      }
    }
    
    const user = SYSTEM_USERS.find(u => u.username === username && u.password === password);
    return { user: user || null, error: user ? null : 'Demo Modu: Hatalı giriş.' };
  }

  // SAAS Methods

  async getAllTenants(): Promise<Tenant[]> {
      if (!this.useLive) return [];
      const { data, error } = await supabase.from('tenants').select('*');
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
    if (!this.useLive) return { success: false, error: "Demo modunda çalışmaz" };

    // Benzersiz ID oluştur
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
    if (!this.useLive) return { success: false, error: "Demo modunda çalışmaz" };

    if (tenantId === 'GLOBAL_HEAD') return { success: false, error: "Ana şirket silinemez!" };

    // 1. Önce bu şirkete bağlı profilleri silelim
    const { error: profileError } = await supabase.from('profiles').delete().eq('company_id', tenantId);
    if (profileError) console.warn("Profil silme uyarısı:", profileError);

    // 2. Şirketi (Tenant) silelim
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  }

  async createUserForTenant(tenantId: string, tenantName: string, email: string, pass: string, name: string, role: UserRole): Promise<{ success: boolean, error: string | null }> {
      if (!this.useLive) return { success: false, error: "Demo modunda çalışmaz" };

      // 1. Auth User Oluştur
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
          // 2. Profile kaydı oluştur
          const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              full_name: name,
              role: role,
              company_id: tenantId,
              company_name: tenantName
          });
          if (profileError) return { success: false, error: "Auth başarılı ama profil oluşamadı: " + profileError.message };
      }

      return { success: true, error: null };
  }

  // --- DATA METHODS (CRUD) ---

  async getProducts(companyId?: string): Promise<Product[]> {
    if (this.useLive && companyId) {
        const { data } = await supabase.from('products').select('*').eq('company_id', companyId);
        if (!data) return [];
        return data.map((d: any) => ({
            id: d.id,
            name: d.name,
            sku: d.sku,
            category: d.category,
            unit: d.unit,
            stock: d.stock,
            criticalThreshold: d.critical_threshold,
            pricing: typeof d.pricing === 'string' ? JSON.parse(d.pricing) : d.pricing,
            sellingPrice: d.selling_price
        }));
    }
    // Fallback Local Storage
    const stored = localStorage.getItem('demo_products');
    return stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
  }

  async upsertProduct(product: Product, companyId?: string): Promise<void> {
    if (this.useLive && companyId) {
        await supabase.from('products').upsert({
            id: product.id.length < 10 ? undefined : product.id,
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
        return;
    }
    // Fallback Local Storage
    const current = await this.getProducts();
    const idx = current.findIndex(p => p.id === product.id);
    let updated;
    if (idx >= 0) {
        updated = [...current];
        updated[idx] = product;
    } else {
        updated = [product, ...current];
    }
    localStorage.setItem('demo_products', JSON.stringify(updated));
  }

  async deleteProduct(id: string): Promise<void> {
    if (this.useLive) {
        await supabase.from('products').delete().eq('id', id);
        return;
    }
    // Fallback Local Storage
    const current = await this.getProducts();
    const updated = current.filter(p => p.id !== id);
    localStorage.setItem('demo_products', JSON.stringify(updated));
  }

  async getContacts(companyId?: string): Promise<Contact[]> {
      if (this.useLive && companyId) {
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
      const stored = localStorage.getItem('demo_contacts');
      return stored ? JSON.parse(stored) : INITIAL_CONTACTS;
  }

  async upsertContact(contact: Contact, companyId?: string): Promise<void> {
      if (this.useLive && companyId) {
          await supabase.from('contacts').upsert({
              id: contact.id.length < 5 ? undefined : contact.id,
              name: contact.name,
              type: contact.type,
              phone: contact.phone,
              address: contact.address,
              company_id: companyId
          });
          return;
      }
      const current = await this.getContacts();
      const idx = current.findIndex(c => c.id === contact.id);
      let updated;
      if (idx >= 0) {
          updated = [...current];
          updated[idx] = contact;
      } else {
          updated = [contact, ...current];
      }
      localStorage.setItem('demo_contacts', JSON.stringify(updated));
  }

  async deleteContact(id: string): Promise<void> {
      if (this.useLive) {
          await supabase.from('contacts').delete().eq('id', id);
          return;
      }
      const current = await this.getContacts();
      const updated = current.filter(c => c.id !== id);
      localStorage.setItem('demo_contacts', JSON.stringify(updated));
  }

  async getTransactions(companyId?: string): Promise<Transaction[]> {
      if (this.useLive && companyId) {
          const { data } = await supabase.from('transactions').select('*').eq('company_id', companyId).order('date', { ascending: false });
          if (!data) return [];
          return data.map((d: any) => ({
              id: d.id,
              items: typeof d.items === 'string' ? JSON.parse(d.items) : d.items,
              type: d.type,
              contactId: d.contact_id,
              contactName: d.contact_name,
              totalAmount: d.total_amount,
              date: d.date,
              user: d.user_name,
              isReturn: d.is_return
          }));
      }
      const stored = localStorage.getItem('demo_transactions');
      return stored ? JSON.parse(stored) : [];
  }

  async saveTransaction(tx: Transaction, companyId?: string): Promise<void> {
      if (this.useLive && companyId) {
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
          
          // Trigger stock updates
          for (const item of tx.items) {
             if (item.productId && !item.isLabor) {
                 const { data: currentProd } = await supabase.from('products').select('stock').eq('id', item.productId).single();
                 if (currentProd) {
                     const change = tx.type === TransactionType.IN ? item.quantity : -item.quantity;
                     const newStock = currentProd.stock + change;
                     await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
                 }
             }
          }
          return;
      }
      
      const current = await this.getTransactions();
      const updated = [tx, ...current];
      localStorage.setItem('demo_transactions', JSON.stringify(updated));

      // Update demo products stock
      if (!companyId) { // Demo mode
          const products = await this.getProducts();
          for (const item of tx.items) {
              if (item.productId && !item.isLabor) {
                  const pIndex = products.findIndex(p => p.id === item.productId);
                  if (pIndex >= 0) {
                      const change = tx.type === TransactionType.IN ? item.quantity : -item.quantity;
                      products[pIndex].stock += change;
                  }
              }
          }
          localStorage.setItem('demo_products', JSON.stringify(products));
      }
  }
}

export const dataService = new DataService();