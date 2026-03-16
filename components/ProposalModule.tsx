
import React, { useState, useEffect } from 'react';
import { Product, Contact, TransactionItem, Proposal, ProposalTemplate } from '../types';
import { formatCurrency } from '../utils/helpers';
import { dataService } from '../services/dataService';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import { jsPDF } from 'jspdf';

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
    console.log("PDF süreci başlatıldı...", proposal.id);
    
    try {
      // 1. Logo Hazırlığı
      let logoBase64 = null;
      if (template?.logoUrl) {
        if (template.logoUrl.startsWith('data:image/')) {
          // Zaten Base64 formatında kaydedilmiş
          logoBase64 = template.logoUrl;
        } else {
          // Hala URL formatındaysa (Eski kayıtlar için)
          try {
            const response = await fetch(template.logoUrl);
            if (response.ok) {
              const blob = await response.blob();
              logoBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => resolve(reader.result as string);
              });
            }
          } catch (e) {
            console.warn("Logo URL'den yüklenemedi:", e);
          }
        }
      }

      // 2. Gizli Elementi Oluştur
      const printElement = document.createElement('div');
      printElement.id = 'pdf-render-element';
      Object.assign(printElement.style, {
        position: 'absolute',
        left: '-9999px',
        top: '0',
        width: '210mm',
        backgroundColor: 'white',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#1e293b'
      });

      const softColor = '#64748b';
      const accentColor = '#f8fafc';
      const borderColor = '#e2e8f0';

      // 3. İçeriği Hazırla (CSS özelliklerini kebab-case yaptık)
      printElement.innerHTML = DOMPurify.sanitize(`
        <div style="padding: 20mm; min-height: 297mm; display: flex; flex-direction: column;">
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
              <div>
                ${logoBase64 ? `<img src="${logoBase64}" style="max-height: 70px; max-width: 200px; margin-bottom: 15px; object-fit: contain;" />` : '<div style="height: 70px; margin-bottom: 15px;"></div>'}
                <h1 style="font-size: 28px; font-weight: 800; color: ${softColor}; margin: 0; letter-spacing: -1px;">TEKLİF FORMU</h1>
              </div>
              <div style="text-align: right; font-size: 11px; color: #94a3b8;">
                <div style="background: ${accentColor}; padding: 15px; border-radius: 12px; border: 1px solid ${borderColor};">
                  <p style="margin: 0 0 4px 0;"><strong style="color: ${softColor};">Teklif No:</strong> <span style="color: #1e293b;">${proposal.id}</span></p>
                  <p style="margin: 0 0 4px 0;"><strong style="color: ${softColor};">Tarih:</strong> <span style="color: #1e293b;">${new Date(proposal.date).toLocaleDateString('tr-TR')}</span></p>
                  <p style="margin: 0;"><strong style="color: ${softColor};">Geçerlilik:</strong> <span style="color: #1e293b;">${new Date(proposal.validUntil).toLocaleDateString('tr-TR')}</span></p>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 35px; background: ${accentColor}; padding: 20px; border-radius: 16px; border: 1px solid ${borderColor};">
              <h3 style="font-size: 10px; font-weight: 800; color: #94a3b8; margin: 0 0 10px 0; text-transform: uppercase;">Müşteri Bilgileri</h3>
              <p style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0;">${proposal.contactName}</p>
              ${proposal.contactPerson ? `<p style="font-size: 13px; color: #64748b; margin: 6px 0 0 0;">İlgili Kişi: <strong style="color: #1e293b;">${proposal.contactPerson}</strong></p>` : ''}
            </div>

            <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 30px; font-size: 12px; border: 1px solid ${borderColor}; border-radius: 12px; overflow: hidden;">
              <thead>
                <tr style="background-color: ${softColor}; color: white;">
                  <th style="padding: 12px 15px; text-align: left;">#</th>
                  <th style="padding: 12px 15px; text-align: left;">Ürün / Hizmet Açıklaması</th>
                  <th style="padding: 12px 15px; text-align: center;">Miktar</th>
                  <th style="padding: 12px 15px; text-align: right;">Birim Fiyat</th>
                  <th style="padding: 12px 15px; text-align: right;">İskonto</th>
                  <th style="padding: 12px 15px; text-align: right;">Toplam</th>
                </tr>
              </thead>
              <tbody>
                ${proposal.items.map((item, index) => `
                  <tr style="background-color: ${index % 2 === 0 ? 'white' : '#fcfcfd'};">
                    <td style="padding: 12px 15px; border-top: 1px solid ${borderColor}; color: #94a3b8;">${index + 1}</td>
                    <td style="padding: 12px 15px; border-top: 1px solid ${borderColor}; font-weight: 600; color: #1e293b;">${item.productName}</td>
                    <td style="padding: 12px 15px; border-top: 1px solid ${borderColor}; text-align: center;">${item.quantity}</td>
                    <td style="padding: 12px 15px; border-top: 1px solid ${borderColor}; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                    <td style="padding: 12px 15px; border-top: 1px solid ${borderColor}; text-align: right; color: #ef4444;">${item.discount ? formatCurrency(item.discount) : '-'}</td>
                    <td style="padding: 12px 15px; border-top: 1px solid ${borderColor}; text-align: right; font-weight: 700;">${formatCurrency(calculateItemTotal(item))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
              <div style="width: 280px; background: ${accentColor}; padding: 20px; border-radius: 16px; border: 1px solid ${borderColor};">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #64748b;">
                  <span>Ara Toplam:</span>
                  <span style="color: #1e293b; font-weight: 600;">${formatCurrency(proposal.subtotal)}</span>
                </div>
                ${proposal.totalDiscount > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #ef4444;">
                    <span>Toplam İskonto:</span>
                    <span style="font-weight: 600;">-${formatCurrency(proposal.totalDiscount)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: #64748b;">
                  <span>KDV (%${vatRate}):</span>
                  <span style="color: #1e293b; font-weight: 600;">${formatCurrency(proposal.vatTotal || 0)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 12px 0 0 0; border-top: 1px dashed ${borderColor}; margin-top: 10px; font-weight: 800; font-size: 20px; color: ${softColor};">
                  <span>GENEL TOPLAM</span>
                  <span>${formatCurrency(proposal.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              ${proposal.notes ? `
                <div style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${borderColor};">
                  <h4 style="font-size: 11px; font-weight: 800; color: #94a3b8; margin: 0 0 8px 0; text-transform: uppercase;">Teklif Notları</h4>
                  <p style="font-size: 11px; color: #475569; margin: 0; white-space: pre-wrap; line-height: 1.5;">${proposal.notes}</p>
                </div>
              ` : '<div></div>'}

              ${template?.bankDetails ? `
                <div style="background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${borderColor};">
                  <h4 style="font-size: 11px; font-weight: 800; color: #94a3b8; margin: 0 0 8px 0; text-transform: uppercase;">Banka Bilgileri</h4>
                  <p style="font-size: 11px; color: #475569; margin: 0; white-space: pre-wrap; line-height: 1.5;">${template.bankDetails}</p>
                </div>
              ` : ''}
            </div>

            ${template?.terms ? `
              <div style="margin-top: 20px; background: #fff; padding: 15px; border-radius: 12px; border: 1px solid ${borderColor};">
                <h4 style="font-size: 11px; font-weight: 800; color: #94a3b8; margin: 0 0 8px 0; text-transform: uppercase;">Şartlar ve Koşullar</h4>
                <p style="font-size: 11px; color: #475569; margin: 0; white-space: pre-wrap; line-height: 1.5;">${template.terms}</p>
              </div>
            ` : ''}
          </div>

          ${template?.footerText ? `
            <div style="margin-top: 40px; padding-top: 15px; border-top: 1px solid ${borderColor}; text-align: center; font-size: 10px; color: #94a3b8;">
              ${template.footerText}
            </div>
          ` : ''}
        </div>
      `, { ADD_ATTR: ['style'] });

      document.body.appendChild(printElement);

      // 4. Render Beklemesi (Kritik!)
      await new Promise(resolve => setTimeout(resolve, 800));

      // 5. Canvas ve PDF Oluşturma
      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      
      pdf.save(`Teklif_${proposal.id}.pdf`);
      console.log("PDF Tamamlandı.");
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      // Her durumda temizlik yap
      const el = document.getElementById('pdf-render-element');
      if (el) el.remove();
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-6 flex items-center text-slate-700"><span className="mr-2">📝</span> Yeni Teklif Hazırla</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Ürün/Hizmet Adı</label>
                <input 
                  type="text"
                  placeholder="Ürün veya hizmet adını yazın..."
                  className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm focus:ring-2 focus:ring-slate-400 outline-none transition-all"
                  value={manualProductName}
                  onChange={e => setManualProductName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Birim Fiyat (KDV Hariç)</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl bg-slate-50 border-slate-100 text-sm font-bold text-slate-700" 
                  value={manualUnitPrice} 
                  onChange={e => setManualUnitPrice(parseFloat(e.target.value) || 0)} 
                  min="0" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Miktar</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl bg-slate-50 border-slate-100 text-sm font-bold text-slate-700" 
                  value={qty} 
                  onChange={e => setQty(parseFloat(e.target.value) || 0)} 
                  min="1" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">İskonto (TL)</label>
                <input 
                  type="number" 
                  className="w-full p-4 rounded-xl bg-slate-50 border-slate-100 text-sm font-bold text-slate-700" 
                  value={discount} 
                  onChange={e => setDiscount(parseFloat(e.target.value) || 0)} 
                  min="0" 
                />
              </div>
              <div className="md:col-span-3">
                <button 
                  onClick={addToCart}
                  className="mt-5 w-full py-4 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 transition shadow-lg shadow-slate-200"
                >
                  Kalem Ekle
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-bold text-slate-700">Teklif Kalemleri</h3>
            </div>
            <div className="p-6">
              {cart.length === 0 ? (
                <p className="text-center text-slate-400 italic py-8">Henüz kalem eklenmedi.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800">{item.productName}</p>
                        <p className="text-xs text-slate-400">{item.quantity} x {formatCurrency(item.unitPrice)} {item.discount ? `(-${formatCurrency(item.discount)})` : ''}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="font-black text-slate-600">{formatCurrency(calculateItemTotal(item))}</p>
                        <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 p-8 rounded-3xl text-white shadow-xl">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Teklif Detayları</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">Müşteri Adı / Ünvanı</label>
                <input 
                  type="text"
                  placeholder="Müşteri adını yazın..."
                  className="w-full bg-slate-700 border-slate-600 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-slate-500 transition-all"
                  value={manualContactName}
                  onChange={e => setManualContactName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">İlgili Kişi</label>
                <input 
                  type="text"
                  placeholder="İlgili kişi adı..."
                  className="w-full bg-slate-700 border-slate-600 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-slate-500 transition-all"
                  value={manualContactPerson}
                  onChange={e => setManualContactPerson(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">KDV Oranı (%)</label>
                  <select 
                    className="w-full bg-slate-700 border-slate-600 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-slate-500 transition-all"
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
                  <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">Geçerlilik</label>
                  <input 
                    type="date" 
                    className="w-full bg-slate-700 border-slate-600 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-slate-500 transition-all"
                    value={validUntil}
                    onChange={e => setValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">Notlar</label>
                <textarea 
                  className="w-full bg-slate-700 border-slate-600 rounded-xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-slate-500 h-24 transition-all"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Teklif notları..."
                />
              </div>

              <div className="pt-6 border-t border-slate-700">
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
                  <span className="text-3xl font-black text-slate-200">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <button 
                onClick={handleSaveProposal}
                disabled={cart.length === 0}
                className="w-full py-5 bg-slate-600 text-white font-black text-lg rounded-2xl hover:bg-slate-500 transition disabled:opacity-50 shadow-xl shadow-slate-900/20"
              >
                TEKLİFİ KAYDET
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-700">Geçmiş Teklifler</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Teklif No</th>
                <th className="px-6 py-4">Müşteri</th>
                <th className="px-6 py-4">Tarih</th>
                <th className="px-6 py-4">Geçerlilik</th>
                <th className="px-6 py-4">Tutar</th>
                <th className="px-6 py-4">Durum</th>
                <th className="px-6 py-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {proposals.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{p.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{p.contactName}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(p.date).toLocaleDateString('tr-TR')}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{new Date(p.validUntil).toLocaleDateString('tr-TR')}</td>
                  <td className="px-6 py-4 font-black text-slate-900">{formatCurrency(p.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 uppercase">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => generatePDF(p)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
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
