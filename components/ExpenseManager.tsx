
import React, { useState } from 'react';
import { Expense, User, UserRole } from '../types';
import { formatCurrency } from '../utils/helpers';

interface ExpenseManagerProps {
  expenses: Expense[];
  onAdd: (expense: Expense) => void;
  onDelete: (id: string) => void;
  user: User;
}

const CATEGORIES = ['Yakıt', 'Kargo', 'Vergi', 'Kira', 'Yemek', 'Market', 'Maaş', 'Elektrik/Su', 'Diğer'];

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, onAdd, onDelete, user }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ category: 'Diğer', amount: 0, description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) return alert('Lütfen geçerli bir tutar girin.');

    onAdd({
      id: Math.random().toString(36).substring(7).toUpperCase(),
      companyId: user.companyId || '',
      category: formData.category,
      amount: formData.amount,
      description: formData.description,
      date: new Date().toISOString(),
      user_name: user.name
    });

    setFormData({ category: 'Diğer', amount: 0, description: '' });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Gider Kayıtları</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">İşletme Operasyonel Harcamaları</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-red-600 text-white font-black rounded-xl shadow-lg hover:bg-red-700 transition active:scale-95 shadow-red-500/20">
          + Yeni Masraf Ekle
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b">
              <th className="py-5 px-6">Tarih</th>
              <th className="py-5 px-6">Kategori</th>
              <th className="py-5 px-6">Açıklama</th>
              <th className="py-5 px-6">Personel</th>
              <th className="py-5 px-6">Tutar</th>
              <th className="py-5 px-6 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {expenses.map(e => (
              <tr key={e.id} className="hover:bg-red-50/30 transition">
                <td className="py-4 px-6 font-medium text-gray-500">{new Date(e.date).toLocaleDateString('tr-TR')}</td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg font-bold text-[10px] uppercase">
                    {e.category}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-700 font-bold italic">{e.description}</td>
                <td className="py-4 px-6 text-gray-400">{e.user_name}</td>
                <td className="py-4 px-6 font-black text-gray-900">{formatCurrency(e.amount)}</td>
                <td className="py-4 px-6 text-right">
                  <button onClick={() => { if(confirm('Bu kaydı silmek istediğinize emin misiniz?')) onDelete(e.id); }} className="p-2 text-red-400 hover:text-red-600">🗑️</button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={6} className="py-20 text-center text-gray-300 italic">Henüz gider kaydı bulunmuyor.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <form onSubmit={handleSubmit}>
              <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Yeni Masraf Girişi</h3>
                <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kategori</label>
                  <select 
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-red-500"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tutar (TL)</label>
                  <input 
                    type="number" 
                    required 
                    className="w-full p-4 rounded-xl border-2 border-red-50 text-2xl font-black text-red-600 focus:ring-2 focus:ring-red-500 outline-none" 
                    value={formData.amount || ''} 
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Açıklama / Not</label>
                  <textarea 
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-red-500" 
                    rows={3}
                    placeholder="Detay belirtin..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex justify-end space-x-3">
                <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 font-bold">Vazgeç</button>
                <button type="submit" className="px-10 py-4 bg-red-600 text-white font-black rounded-xl shadow-lg shadow-red-500/20">MASRAFI KAYDET</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
