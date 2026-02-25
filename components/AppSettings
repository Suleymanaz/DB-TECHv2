
import React, { useState } from 'react';
import { Tenant } from '../types';

interface SettingsProps {
  tenant: Tenant;
  onUpdate: (categories: string[], units: string[]) => Promise<boolean>;
}

const AppSettings: React.FC<SettingsProps> = ({ tenant, onUpdate }) => {
  const [categories, setCategories] = useState<string[]>(tenant.categories || []);
  const [units, setUnits] = useState<string[]>(tenant.units || []);
  const [newCat, setNewCat] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
      setLoading(true);
      const success = await onUpdate(categories, units);
      setLoading(false);
      if (success) alert('Ayarlar başarıyla kaydedildi.');
  };

  const addCategory = () => {
      if (!newCat.trim()) return;
      if (categories.includes(newCat.trim())) return alert('Bu kategori zaten var.');
      setCategories([...categories, newCat.trim()]);
      setNewCat('');
  };

  const removeCategory = (index: number) => {
      setCategories(categories.filter((_, i) => i !== index));
  };

  const addUnit = () => {
      if (!newUnit.trim()) return;
      if (units.includes(newUnit.trim())) return alert('Bu birim zaten var.');
      setUnits([...units, newUnit.trim()]);
      setNewUnit('');
  };

  const removeUnit = (index: number) => {
      setUnits(units.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10">
            <h2 className="text-3xl font-black">Şirket Yapılandırması</h2>
            <p className="text-indigo-200 text-sm mt-2">İşletmenize özel kategorileri ve temel ölçü birimlerini buradan özelleştirin.</p>
         </div>
         <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Kategoriler */}
         <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
               <span className="mr-2">🏷️</span> Ürün Kategorileri
            </h3>
            <div className="flex gap-2 mb-6">
                <input 
                   type="text" 
                   className="flex-1 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                   placeholder="Örn: Kablo, Bakliyat..."
                   value={newCat}
                   onChange={e => setNewCat(e.target.value)}
                   onKeyPress={e => e.key === 'Enter' && addCategory()}
                />
                <button onClick={addCategory} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl">+</button>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
                {categories.map((c, i) => (
                    <div key={i} className="bg-slate-50 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 border border-slate-100 flex items-center group">
                        {c}
                        <button onClick={() => removeCategory(i)} className="ml-3 text-slate-300 hover:text-red-500 transition-colors">✕</button>
                    </div>
                ))}
            </div>
         </div>

         {/* Birimler */}
         <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
               <span className="mr-2">📏</span> Ölçü Birimleri
            </h3>
            <div className="flex gap-2 mb-6">
                <input 
                   type="text" 
                   className="flex-1 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                   placeholder="Örn: Ton, Çuval..."
                   value={newUnit}
                   onChange={e => setNewUnit(e.target.value)}
                   onKeyPress={e => e.key === 'Enter' && addUnit()}
                />
                <button onClick={addUnit} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl">+</button>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
                {units.map((u, i) => (
                    <div key={i} className="bg-blue-50 px-4 py-2 rounded-xl text-sm font-bold text-blue-700 border border-blue-100 flex items-center group">
                        {u}
                        <button onClick={() => removeUnit(i)} className="ml-3 text-blue-300 hover:text-red-500 transition-colors">✕</button>
                    </div>
                ))}
            </div>
         </div>
      </div>

      <div className="flex justify-end pt-4">
          <button 
             onClick={handleSave} 
             disabled={loading}
             className="px-12 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
          >
             {loading ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
          </button>
      </div>
    </div>
  );
};

export default AppSettings;
