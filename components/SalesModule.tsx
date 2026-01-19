
import React, { useState } from 'react';
import { Product, Transaction, TransactionType, Contact, TransactionItem } from '../types';
import { calculateUnitCost, formatCurrency } from '../utils/helpers';

interface SalesModuleProps {
  products: Product[];
  contacts: Contact[];
  onAddTransaction: (tx: Transaction) => void;
}

const SalesModule: React.FC<SalesModuleProps> = ({ products, contacts, onAddTransaction }) => {
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('c1');
  const [qty, setQty] = useState(1);
  const [laborName, setLaborName] = useState('Elektrik İşçiliği');
  const [laborPrice, setLaborPrice] = useState(0);

  const product = products.find(p => p.id === selectedProductId);

  const addToCart = () => {
    if (!product) return;
    if (qty > product.stock) return alert('Yetersiz stok!');

    const existingIndex = cart.findIndex(item => item.productId === product.id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity + qty > product.stock) {
        return alert('Sepetteki toplam miktar stok miktarını aşıyor!');
      }
      updatedCart[existingIndex].quantity += qty;
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.sellingPrice // Using product's defined selling price
      }]);
    }
    setQty(1);
    setSelectedProductId('');
  };

  const addLaborToCart = () => {
    if (laborPrice <= 0) return alert('Lütfen geçerli bir işçilik tutarı girin.');
    setCart([...cart, {
      productName: laborName,
      quantity: 1,
      unitPrice: laborPrice,
      isLabor: true
    }]);
    setLaborPrice(0);
    setLaborName('Elektrik İşçiliği');
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleCompleteSale = () => {
    if (cart.length === 0) return alert('Sepet boş!');
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return alert('Lütfen müşteri seçin.');

    onAddTransaction({
      id: Math.random().toString(36).substring(7).toUpperCase(),
      items: cart,
      type: TransactionType.OUT,
      contactId: contact.id,
      contactName: contact.name,
      totalAmount,
      date: new Date().toISOString(),
      user: 'Yönetici'
    });

    setCart([]);
    alert('Satış başarıyla tamamlandı.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {/* Left: Product Selection & Labor */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center"><span className="mr-2 text-blue-500">📦</span> Stoktan Ürün Ekle</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Malzeme Seçimi</label>
              <select 
                className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
              >
                <option value="">Lütfen seçim yapın...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} - {formatCurrency(p.sellingPrice)} (Mevcut: {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Miktar</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold" 
                value={qty} 
                onChange={e => setQty(Number(e.target.value))} 
                min="1" 
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={addToCart} 
                className="w-full bg-blue-600 text-white font-bold h-[46px] rounded-xl hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20"
              >
                Sepete At
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center"><span className="mr-2 text-indigo-500">🛠️</span> Hizmet / İşçilik</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Hizmet Açıklaması</label>
              <input 
                type="text" 
                className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={laborName}
                onChange={e => setLaborName(e.target.value)}
                placeholder="Örn: Montaj Hizmeti"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Hizmet Bedeli</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" 
                value={laborPrice || ''}
                onChange={e => setLaborPrice(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={addLaborToCart} 
                className="w-full bg-indigo-600 text-white font-bold h-[46px] rounded-xl hover:bg-indigo-700 transition active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30">
            <h3 className="text-lg font-bold">Aktif Satış Sepeti</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <span className="text-5xl mb-4 opacity-20">🛒</span>
                <p className="italic text-sm">Satış için henüz bir kalem eklemediniz.</p>
              </div>
            ) : (
              cart.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 transition shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{item.productName}</p>
                    <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{item.isLabor ? 'SERVİS' : 'STOK'}</p>
                  </div>
                  <div className="text-right flex items-center space-x-6">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      <p className="text-md font-black text-gray-900">{formatCurrency(item.quantity * item.unitPrice)}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(i)} 
                      className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Checkout */}
      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl flex flex-col min-h-[600px] border border-slate-800">
          <div className="flex-1">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-10 border-b border-slate-800 pb-4">SATIŞ ONAM VE CARİ</h3>
            
            <div className="mb-10">
              <label className="block text-[10px] text-slate-500 mb-3 font-black uppercase tracking-tighter">MÜŞTERİ / MUHATAP CARİ</label>
              <select 
                className="w-full bg-slate-800 border-slate-700 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedContactId}
                onChange={e => setSelectedContactId(e.target.value)}
              >
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-4 pt-8 mt-auto">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500 uppercase tracking-widest">Ara Toplam:</span>
                <span className="text-slate-300">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500 uppercase tracking-widest">Vergi (Dahil):</span>
                <span className="text-slate-300">0.00 TL</span>
              </div>
              
              <div className="h-px bg-slate-800 my-4"></div>
              
              <div className="flex flex-col items-end space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">GENEL TAHSİLAT TUTARI</span>
                <span className="text-5xl font-black text-blue-400 tracking-tighter">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleCompleteSale}
            disabled={cart.length === 0}
            className={`w-full mt-10 py-6 font-black text-xl rounded-2xl transition shadow-xl active:scale-95 ${
              cart.length > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20' 
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            SATIŞI TAMAMLA
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesModule;
