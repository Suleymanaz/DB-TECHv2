
import React, { useState, useEffect, useRef } from 'react';
import { Product, Transaction, TransactionType, Contact, TransactionItem } from '../types';
import { formatCurrency } from '../utils/helpers';

interface SalesModuleProps {
  products: Product[];
  contacts: Contact[];
  onAddTransaction: (tx: Transaction) => void;
}

const SalesModule: React.FC<SalesModuleProps> = ({ products, contacts, onAddTransaction }) => {
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0); 
  const [laborName, setLaborName] = useState('Hizmet Bedeli');
  const [laborPrice, setLaborPrice] = useState(0);
  const [showProductList, setShowProductList] = useState(false);
  const productListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productListRef.current && !productListRef.current.contains(event.target as Node)) {
        setShowProductList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (contacts.length > 0) {
      const isValid = contacts.some(c => c.id === selectedContactId);
      if (!isValid) {
        const perakende = contacts.find(c => c.name.toUpperCase().includes('PERAKENDE'));
        if (perakende) setSelectedContactId(perakende.id);
        else setSelectedContactId(contacts[0]?.id || '');
      }
    }
  }, [contacts]);

  const product = products.find(p => p.id === selectedProductId);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addToCart = () => {
    if (!product) return;
    if (qty > product.stock) return alert('Yetersiz stok!');

    const existingIndex = cart.findIndex(item => item.productId === product.id && item.discount === discount);
    
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
        unitPrice: product.sellingPrice,
        discount: discount > 0 ? discount : undefined
      }]);
    }
    setQty(1);
    setDiscount(0);
    setSelectedProductId('');
    setProductSearch('');
  };

  const addLaborToCart = () => {
    if (laborPrice <= 0) return alert('Lütfen geçerli bir tutar girin.');
    setCart([...cart, {
      productName: laborName,
      quantity: 1,
      unitPrice: laborPrice,
      isLabor: true
    }]);
    setLaborPrice(0);
    setLaborName('Hizmet Bedeli');
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateItemTotal = (item: TransactionItem) => {
    const base = item.unitPrice * item.quantity;
    if (item.discount) {
      return base * (1 - (item.discount / 100));
    }
    return base;
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalAmount = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const totalDiscount = subtotal - totalAmount;

  const totalExcludingVAT = totalAmount / 1.2;
  const vatAmount = totalAmount - totalExcludingVAT;

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
      subtotal,
      totalDiscount,
      totalAmount,
      date: new Date().toISOString(),
      user: 'Yönetici'
    });

    setCart([]);
    alert(`Satış başarıyla tamamlandı. (${contact.name})`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center"><span className="mr-2 text-blue-500">📦</span> Ürün Seçimi</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Malzeme / Ürün</label>
              <div className="relative">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ürün ara (Ad veya SKU)..."
                    className="w-full p-3 mb-2 rounded-xl bg-gray-50 border border-gray-100 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={productSearch}
                    onChange={e => {
                      setProductSearch(e.target.value);
                      setShowProductList(true);
                    }}
                    onFocus={() => setShowProductList(true)}
                  />
                  {showProductList && productSearch && (
                    <div ref={productListRef} className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-xs text-gray-400 italic">Sonuç bulunamadı.</div>
                      ) : (
                        filteredProducts.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={p.stock <= 0}
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setProductSearch(p.name);
                              setShowProductList(false);
                              setDiscount(0);
                            }}
                            className={`w-full text-left p-4 hover:bg-blue-50 transition flex items-center justify-between border-b border-gray-50 last:border-0 ${selectedProductId === p.id ? 'bg-blue-50' : ''} ${p.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div>
                              <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-bold ${p.stock <= 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                {p.stock} {p.unit}
                              </p>
                              <p className="text-[10px] text-gray-400">{formatCurrency(p.sellingPrice)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {product && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">Seçili: {product.name} ({product.stock} {product.unit})</span>
                    <button onClick={() => { setSelectedProductId(''); setProductSearch(''); }} className="text-blue-400 hover:text-blue-600">✕</button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Miktar</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                value={qty === 0 ? '' : qty} 
                placeholder="1"
                onChange={e => setQty(e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                min="1" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">İskonto (%)</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                value={discount === 0 ? '' : discount} 
                placeholder="0"
                onChange={e => setDiscount(e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                min="0" max="100" 
              />
            </div>
            <div className="flex items-end">
              <button onClick={addToCart} className="w-full bg-blue-600 text-white font-bold h-[46px] rounded-xl hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-500/20">Ekle</button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center"><span className="mr-2 text-indigo-500">🛠️</span> Hizmet / İşçilik</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Açıklama</label>
              <input type="text" className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value={laborName} onChange={e => setLaborName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Tutar (KDV Dahil)</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                value={laborPrice === 0 ? '' : laborPrice} 
                placeholder="0.00"
                onChange={e => setLaborPrice(e.target.value === '' ? 0 : parseFloat(e.target.value))} 
              />
            </div>
            <div className="flex items-end">
              <button onClick={addLaborToCart} className="w-full bg-indigo-600 text-white font-bold h-[46px] rounded-xl hover:bg-indigo-700 transition active:scale-95 shadow-lg shadow-indigo-500/20">Ekle</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
          <div className="p-6 border-b border-gray-50 bg-gray-50/30"><h3 className="text-lg font-bold">Satış Sepeti</h3></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-sm">Sepetiniz boş.</div>
            ) : (
              cart.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">{item.productName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.isLabor ? 'Hizmet' : 'Ürün'}</p>
                  </div>
                  <div className="text-right flex items-center space-x-6">
                    <div>
                      <p className="text-[10px] text-gray-400">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      <p className="text-sm font-black text-slate-800">{formatCurrency(calculateItemTotal(item))}</p>
                    </div>
                    <button onClick={() => removeFromCart(i)} className="text-red-400 hover:text-red-600 p-2">✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-2xl flex flex-col min-h-[600px]">
          <div className="flex-1">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-10 border-b border-slate-800 pb-4">ÖDEME VE MÜŞTERİ</h3>
            
            <div className="mb-10">
              <label className="block text-[10px] text-slate-500 mb-3 font-black uppercase">Müşteri Seçimi</label>
              <select 
                className="w-full bg-slate-800 border-slate-700 rounded-2xl p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" 
                value={selectedContactId} 
                onChange={e => setSelectedContactId(e.target.value)}
              >
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {contacts.length === 0 && <option value="">Müşteri Tanımlanmamış!</option>}
              </select>
            </div>

            <div className="space-y-4 pt-8 mt-auto border-t border-slate-800">
              <div className="flex justify-between text-xs font-medium text-slate-400">
                <span>Ara Toplam:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-orange-400">
                <span>İskonto:</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
              
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 border-b border-slate-800 pb-2">
                    <span>KDV Hariç:</span>
                    <span>{formatCurrency(totalExcludingVAT)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>KDV (%20):</span>
                    <span>{formatCurrency(vatAmount)}</span>
                </div>
              </div>

              <div className="pt-6">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">KDV DAHİL TOPLAM</span>
                    <span className="text-5xl font-black text-blue-400 tracking-tighter">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={handleCompleteSale} disabled={cart.length === 0} className={`w-full mt-10 py-6 font-black text-xl rounded-2xl transition shadow-xl active:scale-95 ${cart.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>SATIŞI TAMAMLA</button>
        </div>
      </div>
    </div>
  );
};

export default SalesModule;
