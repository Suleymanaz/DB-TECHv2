
import React, { useState } from 'react';
import { Product, Transaction, TransactionType, Contact, TransactionItem } from '../types';
import { calculateUnitCost, formatCurrency } from '../utils/helpers';

interface PurchaseModuleProps {
  products: Product[];
  contacts: Contact[];
  onAddTransaction: (tx: Transaction) => void;
}

const PurchaseModule: React.FC<PurchaseModuleProps> = ({ products, contacts, onAddTransaction }) => {
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [qty, setQty] = useState(1);
  const [isReturn, setIsReturn] = useState(false);

  const product = products.find(p => p.id === selectedProductId);

  const addToCart = () => {
    if (!product) return;
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + qty } : item));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: calculateUnitCost(product.pricing)
      }]);
    }
    setQty(1);
    setSelectedProductId('');
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleCompletePurchase = () => {
    if (cart.length === 0) return alert('Sepet boş!');
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return alert('Lütfen bir tedarikçi seçin.');

    onAddTransaction({
      id: Math.random().toString(36).substring(7).toUpperCase(),
      items: cart,
      // Alım stok artırır (IN), İade stok azaltır (OUT)
      type: isReturn ? TransactionType.OUT : TransactionType.IN, 
      contactId: contact.id,
      contactName: contact.name,
      totalAmount,
      date: new Date().toISOString(),
      user: 'Yönetici',
      isReturn
    });

    setCart([]);
    alert(isReturn ? 'İade işlemi başarıyla tamamlandı (Stoktan düşüldü).' : 'Alım işlemi başarıyla kaydedildi (Stoklar güncellendi).');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center"><span className="mr-2">📥</span> İşlem Girişi</h3>
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button 
                onClick={() => setIsReturn(false)} 
                className={`px-6 py-2 rounded-xl text-xs font-bold transition duration-200 ${!isReturn ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
              >
                STOK ALIMI
              </button>
              <button 
                onClick={() => setIsReturn(true)} 
                className={`px-6 py-2 rounded-xl text-xs font-bold transition duration-200 ${isReturn ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400'}`}
              >
                TEDARİKÇİ İADE
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Ürün Kartı Seçin</label>
              <select 
                className="w-full p-4 rounded-xl bg-gray-50 border-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
              >
                <option value="">Stok seçiniz...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Miktar</label>
              <input 
                type="number" 
                className="w-full p-4 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold" 
                value={qty} 
                onChange={e => setQty(Number(e.target.value))} 
                min="1" 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={addToCart} 
                className={`w-full font-bold h-[54px] rounded-xl text-white transition active:scale-95 ${isReturn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                Ekle
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-lg font-bold">İşlem Sepeti ({isReturn ? 'İade Listesi' : 'Giriş Listesi'})</h3>
          </div>
          <div className="flex-1 p-6 space-y-3 overflow-y-auto">
            {cart.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-300 italic">Henüz bir ürün eklemediniz.</div>
            )}
            {cart.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition hover:bg-white hover:border-blue-100">
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{item.productName}</p>
                </div>
                <div className="text-right flex items-center space-x-6">
                  <div>
                    <p className="text-xs text-gray-400 font-medium">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                    <p className={`text-lg font-black ${isReturn ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(item.quantity * item.unitPrice)}</p>
                  </div>
                  <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl flex flex-col min-h-[600px]">
          <div className="flex-1">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Onay Ekranı</h3>
            
            <div className="mb-10">
              <label className="block text-[10px] text-slate-500 mb-3 font-bold uppercase tracking-widest">TEDARİKÇİ (CARİ)</label>
              <select 
                className="w-full bg-slate-800 border-slate-700 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
              >
                <option value="">Seçiniz...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-4 border-t border-slate-800 pt-8 mt-auto">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-slate-500 uppercase">Toplam Tutar</span>
                <span className={`text-4xl font-black tracking-tighter ${isReturn ? 'text-red-400' : 'text-green-400'}`}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleCompletePurchase}
            disabled={cart.length === 0}
            className={`w-full mt-10 py-5 text-white font-black text-xl rounded-2xl transition shadow-lg active:scale-95 ${
              cart.length > 0 
                ? (isReturn ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700')
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {isReturn ? 'İADEYİ ONAYLA' : 'ALIMI KAYDET'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseModule;
