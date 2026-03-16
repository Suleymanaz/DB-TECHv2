
import React, { useState, useEffect, useRef } from 'react';
import { Product, Contact, TransactionItem, Proposal, ProposalTemplate } from '../types';
import { formatCurrency } from '../utils/helpers';
import { dataService } from '../services/dataService';
import autoTable from 'jspdf-autotable';

interface ProposalModuleProps {
  products: Product[];
  contacts: Contact[];
  companyId: string;
}

const ProposalModule: React.FC<ProposalModuleProps> = ({ products, contacts, companyId }) => {
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showProductList, setShowProductList] = useState(false);
  const productListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTemplateAndProposals = async () => {
      const t = await dataService.getProposalTemplate(companyId);
      setTemplate(t);
      const p = await dataService.getProposals(companyId);
      setProposals(p);
    };
    fetchTemplateAndProposals();
  }, [companyId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productListRef.current && !productListRef.current.contains(event.target as Node)) {
        setShowProductList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const product = products.find(p => p.id === selectedProductId);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addToCart = () => {
    if (!product) return;
    const existing = cart.find(item => item.productId === product.id && item.discount === discount);
    if (existing) {
      setCart(cart.map(item => (item.productId === product.id && item.discount === discount) ? { ...item, quantity: item.quantity + qty } : item));
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

  const calculateItemTotal = (item: TransactionItem) => {
    const base = item.unitPrice * item.quantity;
    if (item.discount) {
      return Math.max(0, base - item.discount);
    }
    return base;
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalAmount = cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const handleSaveProposal = async () => {
    if (cart.length === 0) return alert('Sepet boş!');
    const contact = contacts.find(c => c.id === selectedContactId);
    if (!contact) return alert('Lütfen bir müşteri seçin.');

    const newProposal: Proposal = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      companyId,
      contactId: contact.id,
      contactName: contact.name,
      items: cart,
      subtotal,
      totalDiscount: subtotal - totalAmount,
      totalAmount,
      date: new Date().toISOString(),
      validUntil: validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'DRAFT',
      notes
    };

    await dataService.saveProposal(newProposal);
    setProposals([newProposal, ...proposals]);
    setCart([]);
    alert('Teklif taslağı kaydedildi.');
  };

  const generatePDF = async (proposal: Proposal) => {
    // Dynamic import to avoid build-time resolution issues
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    // Header
    if (template?.logoUrl) {
      // Note: In a real app, you'd need to handle image loading/base64
      // For now, we'll just put text if logoUrl is present
      doc.setFontSize(20);
      doc.text("TEKLİF FORMU", 105, 20, { align: 'center' });
    } else {
      doc.setFontSize(20);
      doc.text("TEKLİF FORMU", 105, 20, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.text(`Teklif No: ${proposal.id}`, 14, 40);
    doc.text(`Tarih: ${new Date(proposal.date).toLocaleDateString('tr-TR')}`, 14, 45);
    doc.text(`Geçerlilik: ${new Date(proposal.validUntil).toLocaleDateString('tr-TR')}`, 14, 50);

    doc.text("Müşteri Bilgileri:", 14, 65);
    doc.setFont("helvetica", "bold");
    doc.text(proposal.contactName, 14, 70);
    doc.setFont("helvetica", "normal");

    // Table
    const tableData = proposal.items.map((item, index) => [
      index + 1,
      item.productName,
      item.quantity,
      formatCurrency(item.unitPrice),
      item.discount ? formatCurrency(item.discount) : '-',
      formatCurrency(calculateItemTotal(item))
    ]);

    (doc as any).autoTable({
      startY: 80,
      head: [['#', 'Ürün/Hizmet', 'Miktar', 'Birim Fiyat', 'İskonto', 'Toplam']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    doc.text(`Ara Toplam: ${formatCurrency(proposal.subtotal)}`, 140, finalY + 10);
    doc.text(`Toplam İskonto: ${formatCurrency(proposal.totalDiscount)}`, 140, finalY + 15);
    doc.setFont("helvetica", "bold");
    doc.text(`GENEL TOPLAM: ${formatCurrency(proposal.totalAmount)}`, 140, finalY + 25);
    doc.setFont("helvetica", "normal");

    if (proposal.notes) {
      doc.text("Notlar:", 14, finalY + 40);
      doc.setFontSize(8);
      doc.text(proposal.notes, 14, finalY + 45, { maxWidth: 180 });
    }

    if (template?.terms) {
      doc.setFontSize(10);
      doc.text("Şartlar ve Koşullar:", 14, finalY + 65);
      doc.setFontSize(8);
      doc.text(template.terms, 14, finalY + 70, { maxWidth: 180 });
    }

    if (template?.bankDetails) {
      doc.setFontSize(10);
      doc.text("Banka Bilgileri:", 14, finalY + 90);
      doc.setFontSize(8);
      doc.text(template.bankDetails, 14, finalY + 95, { maxWidth: 180 });
    }

    if (template?.footerText) {
      doc.setFontSize(8);
      doc.text(template.footerText, 105, 285, { align: 'center' });
    }

    doc.save(`Teklif_${proposal.id}.pdf`);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-6 flex items-center"><span className="mr-2">📝</span> Yeni Teklif Hazırla</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Ürün Seçin</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ürün ara..."
                    className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={productSearch}
                    onChange={e => {
                      setProductSearch(e.target.value);
                      setShowProductList(true);
                    }}
                    onFocus={() => setShowProductList(true)}
                  />
                  {showProductList && productSearch && (
                    <div ref={productListRef} className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-[300px] overflow-y-auto">
                      {filteredProducts.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setProductSearch(p.name);
                            setShowProductList(false);
                          }}
                          className="w-full text-left p-4 hover:bg-blue-50 transition border-b border-gray-50 last:border-0"
                        >
                          <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">SKU: {p.sku} | Stok: {p.stock}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Miktar</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold" 
                  value={qty} 
                  onChange={e => setQty(parseFloat(e.target.value) || 0)} 
                  min="1" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">İskonto (TL)</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold" 
                  value={discount} 
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)} 
                  min="0" 
                />
              </div>
            </div>
            <button 
              onClick={addToCart}
              className="mt-4 w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
            >
              Sepete Ekle
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-bold">Teklif Kalemleri</h3>
            </div>
            <div className="p-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 italic py-8">Henüz kalem eklenmedi.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <p className="font-bold text-gray-800">{item.productName}</p>
                        <p className="text-xs text-gray-400">{item.quantity} x {formatCurrency(item.unitPrice)} {item.discount ? `(-${formatCurrency(item.discount)})` : ''}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="font-black text-blue-600">{formatCurrency(calculateItemTotal(item))}</p>
                        <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Teklif Detayları</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Müşteri</label>
                <select 
                  className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedContactId}
                  onChange={e => setSelectedContactId(e.target.value)}
                >
                  <option value="">Seçiniz...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Geçerlilik Tarihi</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={validUntil}
                  onChange={e => setValidUntil(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Notlar</label>
                <textarea 
                  className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Teklif notları..."
                />
              </div>

              <div className="pt-6 border-t border-slate-800">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-slate-400">Ara Toplam</span>
                  <span className="text-sm font-bold">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-xs text-slate-400">Toplam İskonto</span>
                  <span className="text-sm font-bold text-red-400">-{formatCurrency(subtotal - totalAmount)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black text-slate-500 uppercase">Genel Toplam</span>
                  <span className="text-3xl font-black text-blue-400">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <button 
                onClick={handleSaveProposal}
                disabled={cart.length === 0}
                className="w-full py-5 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 transition disabled:opacity-50"
              >
                TEKLİFİ KAYDET
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold">Geçmiş Teklifler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Teklif No</th>
                <th className="px-6 py-4">Müşteri</th>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Geçerlilik</th>
                <th className="px-6 py-4">Tutar</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proposals.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{p.id}</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{p.contactName}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(p.date).toLocaleDateString('tr-TR')}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(p.validUntil).toLocaleDateString('tr-TR')}</td>
                  <td className="px-6 py-4 font-black text-gray-900">{formatCurrency(p.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 uppercase">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => generatePDF(p)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                      title="PDF İndir"
                    >
                      📥 PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProposalModule;
