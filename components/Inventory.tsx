
import React, { useState, useMemo, useRef } from 'react';
import { Product, UserRole } from '../types';
import { calculateUnitCost, formatCurrency, exportToCSV } from '../utils/helpers';
import { read, utils, writeFile } from 'xlsx';

interface InventoryProps {
  products: Product[];
  onUpsert: (product: Product) => void;
  onBulkUpsert: (products: Product[]) => void;
  onDelete: (id: string) => void;
  userRole: UserRole;
  categories: string[];
  units: string[];
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpsert, onBulkUpsert, onDelete, userRole, categories, units }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
  const canEdit = isAdmin || userRole === UserRole.PURCHASE;
  const showCosts = isAdmin || userRole === UserRole.PURCHASE;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, filterCategory]);

  const inventoryValueExVAT = useMemo(() => {
    return filteredProducts.reduce((sum, p) => {
      const netUnitCost = p.pricing.purchasePrice * p.pricing.exchangeRate;
      return sum + (netUnitCost * p.stock);
    }, 0);
  }, [filteredProducts]);

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

  const generateStockReport = () => {
    const reportData = filteredProducts.map(p => {
      const netUnitCost = p.pricing.purchasePrice * p.pricing.exchangeRate;
      return {
        'SKU': p.sku,
        'Ürün Adı': p.name,
        'Kategori': p.category,
        'Mevcut Stok': p.stock,
        'Birim': p.unit,
        'KDV Hariç Alış': netUnitCost.toFixed(2),
        'Toplam Tutar (KDV Hariç)': (netUnitCost * p.stock).toFixed(2),
        'Satış Fiyatı': p.sellingPrice.toFixed(2)
      };
    });
    exportToCSV(reportData, `Muhasebe_Stok_Raporu_${new Date().toISOString().split('T')[0]}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws) as any[];

        const newProducts: Product[] = data.map(row => ({
          id: Math.random().toString(36).substring(7),
          sku: String(row['SKU'] || ''),
          name: String(row['Ürün Adı'] || ''),
          category: String(row['Kategori'] || categories[0] || 'Genel'),
          unit: String(row['Birim'] || units[0] || 'Adet'),
          stock: Number(row['Mevcut Stok'] || 0),
          criticalThreshold: Number(row['Kritik Eşik'] || 10),
          pricing: {
            purchasePrice: Number(row['Alış Fiyatı'] || 0),
            exchangeRate: Number(row['Döviz Kuru'] || 1),
            vatRate: Number(row['KDV Oranı (%)'] || 20) / 100,
            otherExpenses: Number(row['Ek Giderler'] || 0)
          },
          sellingPrice: Number(row['Satış Fiyatı'] || 0)
        })).filter(p => p.sku && p.name);

        if (newProducts.length > 0) {
          onBulkUpsert(newProducts);
          alert(`${newProducts.length} ürün başarıyla yüklendi.`);
        } else {
          alert('Geçerli veri bulunamadı. Lütfen formatı kontrol edin.');
        }
      } catch (err) {
        console.error('Excel okuma hatası:', err);
        alert('Dosya okunurken bir hata oluştu.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'SKU': 'STOK001',
        'Ürün Adı': 'Örnek Ürün',
        'Kategori': categories[0] || 'Genel',
        'Birim': units[0] || 'Adet',
        'Mevcut Stok': 100,
        'Kritik Eşik': 10,
        'Alış Fiyatı': 10.50,
        'Döviz Kuru': 1,
        'KDV Oranı (%)': 20,
        'Ek Giderler': 0,
        'Satış Fiyatı': 25.00
      }
    ];
    const ws = utils.json_to_sheet(templateData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Template");
    writeFile(wb, "Stok_Yukleme_Sablonu.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-1 items-center space-x-3 bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition">
            <span className="text-gray-400">🔍</span>
            <input 
              type="text" 
              placeholder="Stok adı veya SKU ile ara..." 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <select 
              className="bg-white px-4 py-3 rounded-xl border border-gray-200 text-sm shadow-sm outline-none cursor-pointer hover:border-indigo-300 transition"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">Tüm Kategoriler</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-xl border border-slate-800">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Muhasebe Toplam Değer (KDV HARİÇ)</p>
            <p className="text-2xl font-black text-indigo-400">{formatCurrency(inventoryValueExVAT)}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-bold italic">* Filtrelenen {filteredProducts.length} kalem ürün baz alınmıştır.</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex space-x-2">
          <button onClick={generateStockReport} className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-200 transition text-sm border border-slate-200">📊 Muhasebe Raporu Al</button>
          {canEdit && (
            <>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isImporting}
                className="px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl shadow-sm hover:bg-emerald-100 transition text-sm border border-emerald-200 disabled:opacity-50"
              >
                {isImporting ? '⌛ Yükleniyor...' : '📥 Excel\'den Yükle'}
              </button>
              <button onClick={downloadTemplate} className="px-4 py-2.5 text-slate-400 hover:text-slate-600 transition text-xs font-bold">
                📄 Şablon İndir
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
            </>
          )}
        </div>
        {canEdit && (
          <button onClick={handleNew} className="px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg hover:bg-indigo-700 transition text-sm shadow-indigo-500/20 active:scale-95 transition-transform">+ Yeni Ürün Tanımla</button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
                <th className="py-5 px-6">SKU / Kategori</th>
                <th className="py-5 px-6">Ürün Tanımı</th>
                <th className="py-5 px-6">Stok</th>
                {showCosts && <th className="py-5 px-6">KDV Hariç Alış</th>}
                {showCosts && <th className="py-5 px-6">Toplam Tutar (KDV Hariç)</th>}
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
                      <p className="font-bold text-gray-800">{p.name}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-black ${isCritical ? 'text-red-500' : 'text-gray-700'}`}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    {showCosts && (
                      <td className="py-4 px-6">
                        <span className="text-sm font-bold text-slate-800">{formatCurrency(netPrice)}</span>
                      </td>
                    )}
                    {showCosts && (
                      <td className="py-4 px-6">
                        <span className="text-sm font-black text-indigo-600">{formatCurrency(totalNetValue)}</span>
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-bold">
                        {formatCurrency(p.sellingPrice)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {canEdit && (
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleEdit(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">✏️</button>
                          <button onClick={() => { if(confirm('Emin misiniz?')) onDelete(p.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && canEdit && (
        <ProductModal product={editingProduct} onClose={() => setShowModal(false)} onSave={onUpsert} categories={categories} units={units} />
      )}
    </div>
  );
};

const ProductModal: React.FC<{ product: Product | null; onClose: () => void; onSave: (p: Product) => void; categories: string[]; units: string[] }> = ({ product, onClose, onSave, categories, units }) => {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: '', sku: '', category: categories[0] || 'Genel', unit: units[0] || 'Adet', stock: 0, criticalThreshold: 10, sellingPrice: 0,
      pricing: { purchasePrice: 0, vatRate: 0.20, exchangeRate: 1, otherExpenses: 0 }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData as Product, id: formData.id || Math.random().toString(36).substring(7) });
    onClose();
  };

  const handleNumChange = (field: string, val: string, nestedField?: string) => {
    const num = val === '' ? 0 : parseFloat(val);
    if (nestedField) {
      setFormData({
        ...formData,
        pricing: { ...formData.pricing!, [nestedField]: num }
      });
    } else {
      setFormData({ ...formData, [field]: num });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800">{product ? 'Stok Güncelle' : 'Yeni Stok Kartı'}</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">✕</button>
          </div>
          <div className="p-8 max-h-[75vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div><label className="text-[10px] text-gray-400 font-bold uppercase">Ürün Adı</label><input className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] text-gray-400 font-bold uppercase">SKU</label><input className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required /></div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Birim</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                    {units.length === 0 && <option value="Adet">Adet (Varsayılan)</option>}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Kategori</label>
                  <select 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    {categories.length === 0 && <option value="Genel">Genel (Varsayılan)</option>}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Kritik Eşik</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    value={formData.criticalThreshold === 0 ? '' : formData.criticalThreshold} 
                    placeholder="0"
                    onChange={e => handleNumChange('criticalThreshold', e.target.value)} 
                  />
                </div>
              </div>
              <div className="pt-4 border-t">
                 <label className="text-[10px] text-gray-400 font-bold uppercase">Satış Fiyatı (KDV DAHİL TRY)</label>
                 <input 
                    type="number" 
                    step="0.01" 
                    className="w-full p-4 rounded-xl border-2 border-green-100 bg-green-50 text-xl font-black text-green-700 focus:ring-2 focus:ring-green-500 outline-none transition-all" 
                    value={formData.sellingPrice === 0 ? '' : formData.sellingPrice} 
                    placeholder="0.00"
                    onChange={e => handleNumChange('sellingPrice', e.target.value)} 
                  />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black text-amber-600 uppercase border-l-4 border-amber-600 pl-3 tracking-widest">Maliyet Analizi</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Birim Alış</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    value={formData.pricing?.purchasePrice === 0 ? '' : formData.pricing?.purchasePrice} 
                    placeholder="0.00"
                    onChange={e => handleNumChange('pricing', e.target.value, 'purchasePrice')} 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Döviz Kuru</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    value={formData.pricing?.exchangeRate === 0 ? '' : formData.pricing?.exchangeRate} 
                    placeholder="1.00"
                    onChange={e => handleNumChange('pricing', e.target.value, 'exchangeRate')} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase">KDV Oranı (%)</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    value={(formData.pricing?.vatRate ?? 0) === 0 ? '' : (formData.pricing?.vatRate ?? 0) * 100} 
                    placeholder="20"
                    onChange={e => handleNumChange('pricing', (parseFloat(e.target.value) / 100).toString(), 'vatRate')} 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase">Ek Giderler</label>
                  <input 
                    type="number" 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                    value={formData.pricing?.otherExpenses === 0 ? '' : formData.pricing?.otherExpenses} 
                    placeholder="0.00"
                    onChange={e => handleNumChange('pricing', e.target.value, 'otherExpenses')} 
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-900 rounded-2xl text-white mt-6 shadow-inner">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Net Birim Maliyet (KDV+Giderli)</p>
                <p className="text-3xl font-black text-amber-400">{formatCurrency(calculateUnitCost(formData.pricing as any))}</p>
                <div className="h-px bg-slate-800 my-4"></div>
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest flex justify-between">
                  <span>KDV HARİÇ ALIŞ:</span>
                  <span>{formatCurrency((formData.pricing?.purchasePrice || 0) * (formData.pricing?.exchangeRate || 1))}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 bg-gray-50 border-t flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700 transition-colors">İptal</button>
            <button type="submit" className="px-12 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform">KAYDET</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
