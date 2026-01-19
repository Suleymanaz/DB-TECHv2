
import React, { useState, useMemo, useRef } from 'react';
import { Product, UserRole } from '../types';
import { CATEGORIES } from '../constants';
import { calculateUnitCost, formatCurrency, exportToCSV } from '../utils/helpers';

interface InventoryProps {
  products: Product[];
  onUpsert: (product: Product) => void;
  onBulkUpsert: (products: Product[]) => void;
  onDelete: (id: string) => void;
  userRole: UserRole;
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpsert, onBulkUpsert, onDelete, userRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === UserRole.ADMIN;
  const canEdit = userRole === UserRole.ADMIN || userRole === UserRole.PURCHASE;
  const showCosts = userRole === UserRole.ADMIN || userRole === UserRole.PURCHASE;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  const handleEdit = (p: Product) => {
    if (!canEdit) return;
    setEditingProduct(p);
    setShowModal(true);
  };

  const handleNew = () => {
    if (!canEdit) return;
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const header = lines[0].toLowerCase().trim();
      
      // Expected: sku,name,category,unit,stock,criticalThreshold,purchasePrice,sellingPrice
      const rows = lines.slice(1).filter(line => line.trim() !== '');
      
      try {
        const parsedProducts: Product[] = rows.map(line => {
          const cols = line.split(',').map(c => c.trim());
          if (cols.length < 8) throw new Error('Geçersiz sütun sayısı');
          
          return {
            id: '', // Will be generated in App.tsx
            sku: cols[0],
            name: cols[1],
            category: cols[2],
            unit: cols[3],
            stock: Number(cols[4]),
            criticalThreshold: Number(cols[5]),
            pricing: {
              purchasePrice: Number(cols[6]),
              exchangeRate: 1, // Default to 1 for bulk imports
              vatRate: 0.20,
              otherExpenses: 0
            },
            sellingPrice: Number(cols[7])
          };
        });

        if (confirm(`${parsedProducts.length} adet stok kaydı içeri aktarılacak. Onaylıyor musunuz?`)) {
          onBulkUpsert(parsedProducts);
          alert('Veriler başarıyla yüklendi.');
        }
      } catch (err) {
        alert('Dosya formatı hatalı! Lütfen SKU, Ad, Kategori, Birim, Stok, Kritik Eşik, Alış, Satış formatına uyduğunuzdan emin olun.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateStockReport = () => {
    const reportData = filteredProducts.map(p => {
      const netUnitCost = p.pricing.purchasePrice * p.pricing.exchangeRate;
      return {
        'SKU': p.sku,
        'Ürün Adı': p.name,
        'Kategori': p.category,
        'Mevcut Stok': p.stock,
        'Birim': p.unit,
        'Birim Net Maliyet (KDV/Gider Hariç)': netUnitCost.toFixed(2),
        'Toplam Net Değer': (netUnitCost * p.stock).toFixed(2),
        'Satış Fiyatı': p.sellingPrice.toFixed(2)
      };
    });
    exportToCSV(reportData, `DB_ERP_Stok_Raporu_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Admin Quick Info */}
      {isAdmin && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">💡</span>
            <p className="text-xs text-indigo-700 font-medium leading-relaxed">
              <strong>Yönetici İpucu:</strong> Toplu stok yüklemek için CSV formatını kullanın.<br/>
              Format: <code className="bg-white px-1 rounded border border-indigo-200">sku,name,category,unit,stock,criticalThreshold,purchasePrice,sellingPrice</code>
            </p>
          </div>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition"
          >
            Excel/CSV Veri Yükle
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center space-x-3 bg-white px-4 py-2 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition">
          <span className="text-gray-400">🔍</span>
          <input 
            type="text" 
            placeholder="Stok adı veya SKU ile hızlı ara..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <select 
            className="bg-white px-4 py-2 rounded-xl border border-gray-200 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">Tüm Kategoriler</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button 
            onClick={generateStockReport}
            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-950 transition flex items-center space-x-2 text-sm border border-slate-800"
          >
            <span>📊</span>
            <span>Raporu Al</span>
          </button>
          {canEdit && (
            <button 
              onClick={handleNew}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition text-sm shadow-indigo-500/20"
            >
              + Yeni Stok Girişi
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="py-5 px-6">SKU / Kategori</th>
                <th className="py-5 px-6">Ürün Tanımı</th>
                <th className="py-5 px-6">Stok</th>
                {showCosts && <th className="py-5 px-6">Birim Net Alış</th>}
                {showCosts && <th className="py-5 px-6">Toplam Net Tutar</th>}
                <th className="py-5 px-6">Satış Fiyatı</th>
                <th className="py-5 px-6 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredProducts.map(p => {
                const netPrice = p.pricing.purchasePrice * p.pricing.exchangeRate;
                const totalNetValue = p.stock * netPrice;
                const isCritical = p.stock <= p.criticalThreshold;

                return (
                  <tr key={p.id} className="hover:bg-indigo-50/30 transition group">
                    <td className="py-4 px-6">
                      <p className="font-mono text-[10px] text-indigo-600 font-bold">{p.sku}</p>
                      <p className="text-[10px] text-gray-400">{p.category}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-800 group-hover:text-indigo-700 transition">{p.name}</p>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <span className={`font-black ${isCritical ? 'text-red-500' : 'text-gray-700'}`}>
                          {p.stock} {p.unit}
                        </span>
                        {isCritical && <span className="animate-pulse">⚠️</span>}
                      </div>
                    </td>
                    {showCosts && (
                      <td className="py-4 px-6">
                        <span className="text-xs font-medium text-gray-600">{formatCurrency(netPrice)}</span>
                      </td>
                    )}
                    {showCosts && (
                      <td className="py-4 px-6">
                        <span className="text-sm font-black text-slate-800">{formatCurrency(totalNetValue)}</span>
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-bold">
                        {formatCurrency(p.sellingPrice)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {canEdit ? (
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleEdit(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Düzenle">✏️</button>
                          <button onClick={() => { if(confirm('Bu stok kartını silmek istediğinize emin misiniz?')) onDelete(p.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Sil">🗑️</button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter">Salt Okunur</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={showCosts ? 7 : 5} className="py-20 text-center text-gray-300 italic">
                    DB ERP: Kriterlere uygun stok kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && canEdit && (
        <ProductModal 
          product={editingProduct} 
          onClose={() => setShowModal(false)} 
          onSave={onUpsert} 
        />
      )}
    </div>
  );
};

const ProductModal: React.FC<{ 
  product: Product | null; 
  onClose: () => void; 
  onSave: (p: Product) => void 
}> = ({ product, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: '',
      sku: '',
      category: CATEGORIES[0],
      unit: 'Adet',
      stock: 0,
      criticalThreshold: 10,
      sellingPrice: 0,
      pricing: {
        purchasePrice: 0,
        vatRate: 0.20,
        exchangeRate: 1,
        otherExpenses: 0
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) return alert('İsim ve SKU zorunludur');
    onSave({
      ...formData as Product,
      id: formData.id || Math.random().toString(36).substring(7),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{product ? 'Stok Kartı Güncelle' : 'Yeni Stok Kartı Tanımla'}</h2>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">DB ERP Kurumsal Modül</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="p-8 max-h-[75vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-l-4 border-indigo-600 pl-3">Stok Kimlik Kartı</h3>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Ürün Tanımı</label>
                <input className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Örn: 3x1.5 TTR Kablo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Katalog No / SKU</label>
                  <input className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required placeholder="KOD-123" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Ölçü Birimi</label>
                  <input className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="Adet, Metre..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Kategori</label>
                  <select className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Kritik Stok Uyarı</label>
                  <input type="number" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.criticalThreshold} onChange={e => setFormData({...formData, criticalThreshold: Number(e.target.value)})} />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                 <h3 className="text-xs font-black text-green-600 uppercase tracking-widest border-l-4 border-green-600 pl-3 mb-4">Satış Yönetimi</h3>
                 <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Ürün Satış Fiyatı (TRY)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full p-4 rounded-xl border-2 border-green-100 bg-green-50 text-xl font-black text-green-900 focus:ring-2 focus:ring-green-500 outline-none" 
                      value={formData.sellingPrice} 
                      onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} 
                      placeholder="0.00"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 italic">* Satış personeli bu fiyat üzerinden işlem yapacaktır.</p>
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest border-l-4 border-amber-600 pl-3">Alış & Maliyet Analizi</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Birim Alış</label>
                  <input type="number" step="0.01" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.pricing?.purchasePrice} onChange={e => setFormData({...formData, pricing: { ...formData.pricing!, purchasePrice: Number(e.target.value) }})} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Döviz Kuru</label>
                  <input type="number" step="0.01" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.pricing?.exchangeRate} onChange={e => setFormData({...formData, pricing: { ...formData.pricing!, exchangeRate: Number(e.target.value) }})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">KDV Oranı (%)</label>
                  <input type="number" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={(formData.pricing?.vatRate ?? 0) * 100} onChange={e => setFormData({...formData, pricing: { ...formData.pricing!, vatRate: Number(e.target.value) / 100 }})} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1 font-bold uppercase tracking-wider">Ek Gider Payı (TRY)</label>
                  <input type="number" className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.pricing?.otherExpenses} onChange={e => setFormData({...formData, pricing: { ...formData.pricing!, otherExpenses: Number(e.target.value) }})} />
                </div>
              </div>
              
              <div className="p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-800 mt-6 transform hover:scale-[1.02] transition">
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Hesaplanan Giriş Maliyeti</p>
                <p className="text-3xl font-black text-white">{formatCurrency(calculateUnitCost(formData.pricing as any))}</p>
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                   <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Net Birim Alış:</div>
                   <div className="text-xs font-bold text-indigo-200">{formatCurrency(formData.pricing!.purchasePrice * formData.pricing!.exchangeRate)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">Vazgeç</button>
            <button type="submit" className="px-12 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition active:scale-95 shadow-indigo-500/20">VERİLERİ KAYDET</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
