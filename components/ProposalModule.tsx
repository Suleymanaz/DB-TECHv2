
import React, { useState, useEffect } from 'react';
import { Product, Contact, TransactionItem, Proposal, ProposalTemplate } from '../types';
import { formatCurrency } from '../utils/helpers';
import { dataService } from '../services/dataService';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';

interface ProposalModuleProps {
  products: Product[];
  contacts: Contact[];
  companyId: string;
}

const ProposalModule: React.FC<ProposalModuleProps> = ({ companyId }) => {
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [manualProductName, setManualProductName] = useState('');
  const [manualUnitPrice, setManualUnitPrice] = useState(0);
  const [manualContactName, setManualContactName] = useState('');
  const [manualContactPerson, setManualContactPerson] = useState('');
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(20);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [template, setTemplate] = useState<ProposalTemplate | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    const fetchTemplateAndProposals = async () => {
      const t = await dataService.getProposalTemplate(companyId);
      setTemplate(t);
      const p = await dataService.getProposals(companyId);
      setProposals(p);
    };
    fetchTemplateAndProposals();
  }, [companyId]);

  const addToCart = () => {
    if (!manualProductName || manualUnitPrice <= 0) return alert('Lütfen ürün adı ve fiyatı girin.');
    
    setCart([...cart, {
      productName: manualProductName,
      quantity: qty,
      unitPrice: manualUnitPrice,
      discount: discount > 0 ? discount : undefined
    }]);
    
    setQty(1);
    setDiscount(0);
    setManualProductName('');
    setManualUnitPrice(0);
  };

  const calculateItemTotal = (item: TransactionItem) => {
    const base = item.unitPrice * item.quantity;
    if (item.discount) {
      return Math.max(0, base - item.discount);
    }
    return base;
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  const amountBeforeVat = subtotal - totalDiscount;
  const vatTotal = (amountBeforeVat * vatRate) / 100;
  const totalAmount = amountBeforeVat + vatTotal;

  const handleSaveProposal = async () => {
    if (cart.length === 0) return alert('Sepet boş!');
    if (!manualContactName) return alert('Lütfen müşteri adını girin.');

    const newProposal: Proposal = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      companyId,
      contactName: manualContactName,
      contactPerson: manualContactPerson,
      items: cart,
      subtotal,
      totalDiscount,
      vatTotal,
      totalAmount,
      date: new Date().toISOString(),
      validUntil: validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'DRAFT',
      notes
    };

    await dataService.saveProposal(newProposal);
    setProposals([newProposal, ...proposals]);
    setCart([]);
    setManualContactName('');
    setManualContactPerson('');
    alert('Teklif taslağı kaydedildi.');
  };

  const generatePDF = async (proposal: Proposal) => {
    const { jsPDF } = await import('jspdf');
    
    // Create a hidden element for PDF generation
    const printElement = document.createElement('div');
    printElement.style.position = 'fixed';
    printElement.style.left = '-9999px';
    printElement.style.top = '0';
    printElement.style.width = '210mm'; // A4 width
    printElement.style.backgroundColor = 'white';
    printElement.style.padding = '20mm';
    printElement.style.fontFamily = 'Arial, sans-serif';
    printElement.style.color = '#333';

    const logoHtml = template?.logoUrl ? `<img src="${template.logoUrl}" style="max-height: 60px; margin-bottom: 20px;" />` : '';
    
    printElement.innerHTML = DOMPurify.sanitize(`
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          ${logoHtml}
          <h1 style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 0;">TEKLİF FORMU</h1>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          <p style="margin: 2px 0;"><strong>Teklif No:</strong> ${proposal.id}</p>
          <p style="margin: 2px 0;"><strong>Tarih:</strong> ${new Date(proposal.date).toLocaleDateString('tr-TR')}</p>
          <p style="margin: 2px 0;"><strong>Geçerlilik:</strong> ${new Date(proposal.validUntil).toLocaleDateString('tr-TR')}</p>
        </div>
      </div>

      <div style="margin-top: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">
        <h3 style="font-size: 14px; font-weight: bold; color: #64748b; margin-bottom: 5px; text-transform: uppercase;">Müşteri Bilgileri</h3>
        <p style="font-size: 16px; font-weight: bold; margin: 0;">${proposal.contactName}</p>
        ${proposal.contactPerson ? `<p style="font-size: 14px; margin: 5px 0 0 0;">İlgili Kişi: ${proposal.contactPerson}</p>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 12px;">
        <thead>
          <tr style="background-color: #4f46e5; color: white;">
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">#</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #e2e8f0;">Ürün/Hizmet</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #e2e8f0;">Miktar</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #e2e8f0;">Birim Fiyat (KDV Hariç)</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #e2e8f0;">İskonto</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #e2e8f0;">Toplam</th>
          </tr>
        </thead>
        <tbody>
          ${proposal.items.map((item, index) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${index + 1}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${item.productName}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unitPrice)}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${item.discount ? formatCurrency(item.discount) : '-'}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${formatCurrency(calculateItemTotal(item))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 30px; display: flex; justify-content: flex-end;">
        <div style="width: 250px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>Ara Toplam:</span>
            <span>${formatCurrency(proposal.subtotal)}</span>
          </div>
          ${proposal.totalDiscount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 5px 0; color: #ef4444;">
              <span>Toplam İskonto:</span>
              <span>-${formatCurrency(proposal.totalDiscount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span>KDV (%${vatRate}):</span>
            <span>${formatCurrency(proposal.vatTotal || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #1e293b; margin-top: 5px; font-weight: bold; font-size: 16px; color: #1e293b;">
            <span>GENEL TOPLAM:</span>
            <span>${formatCurrency(proposal.totalAmount)}</span>
          </div>
        </div>
      </div>

      ${proposal.notes ? `
        <div style="margin-top: 40px;">
          <h4 style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">Notlar:</h4>
          <p style="font-size: 10px; color: #64748b; white-space: pre-wrap;">${proposal.notes}</p>
        </div>
      ` : ''}

      ${template?.terms ? `
        <div style="margin-top: 30px;">
          <h4 style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">Şartlar ve Koşullar:</h4>
          <p style="font-size: 10px; color: #64748b; white-space: pre-wrap;">${template.terms}</p>
        </div>
      ` : ''}

      ${template?.bankDetails ? `
        <div style="margin-top: 30px;">
          <h4 style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">Banka Bilgileri:</h4>
          <p style="font-size: 10px; color: #64748b; white-space: pre-wrap;">${template.bankDetails}</p>
        </div>
      ` : ''}

      ${template?.footerText ? `
        <div style="position: absolute; bottom: 20mm; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; margin: 0 20mm;">
          ${template.footerText}
        </div>
      ` : ''}
    `);

    document.body.appendChild(printElement);

    try {
      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Teklif_${proposal.id}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF oluşturulurken bir hata oluştu.');
    } finally {
      document.body.removeChild(printElement);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-6 flex items-center"><span className="mr-2">📝</span> Yeni Teklif Hazırla</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Ürün/Hizmet Adı</label>
                <input 
                  type="text"
                  placeholder="Ürün veya hizmet adını yazın..."
                  className="w-full p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={manualProductName}
                  onChange={e => setManualProductName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">Birim Fiyat (KDV Hariç)</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl bg-gray-50 border-gray-100 text-sm font-bold" 
                  value={manualUnitPrice} 
                  onChange={e => setManualUnitPrice(parseFloat(e.target.value) || 0)} 
                  min="0" 
                />
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
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
              <div className="md:col-span-3">
                <button 
                  onClick={addToCart}
                  className="mt-5 w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
                >
                  Kalem Ekle
                </button>
              </div>
            </div>
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
                <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Müşteri Adı / Ünvanı</label>
                <input 
                  type="text"
                  placeholder="Müşteri adını yazın..."
                  className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={manualContactName}
                  onChange={e => setManualContactName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">İlgili Kişi</label>
                <input 
                  type="text"
                  placeholder="İlgili kişi adı..."
                  className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={manualContactPerson}
                  onChange={e => setManualContactPerson(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">KDV Oranı (%)</label>
                  <select 
                    className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    value={vatRate}
                    onChange={e => setVatRate(parseInt(e.target.value))}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Geçerlilik</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-800 border-slate-700 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                  />
                </div>
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
                  <span className="text-xs text-slate-400">Ara Toplam (KDV Hariç)</span>
                  <span className="text-sm font-bold">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-slate-400">Toplam İskonto</span>
                    <span className="text-sm font-bold text-red-400">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between mb-4">
                  <span className="text-xs text-slate-400">KDV (%{vatRate})</span>
                  <span className="text-sm font-bold">{formatCurrency(vatTotal)}</span>
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
