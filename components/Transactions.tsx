
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { exportToCSV, formatCurrency } from '../utils/helpers';

interface TransactionsProps {
  transactions: Transaction[];
  companyName?: string;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, companyName }) => {
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesType = filterType === 'ALL' || tx.type === filterType;
      const txDate = new Date(tx.date);
      txDate.setHours(0,0,0,0);
      let matchesStart = true;
      if (startDate) {
          const start = new Date(startDate);
          start.setHours(0,0,0,0);
          matchesStart = txDate >= start;
      }
      let matchesEnd = true;
      if (endDate) {
          const end = new Date(endDate);
          end.setHours(0,0,0,0);
          matchesEnd = txDate <= end;
      }
      return matchesType && matchesStart && matchesEnd;
    });
  }, [transactions, filterType, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      count: filteredTransactions.length,
      total: filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0)
    };
  }, [filteredTransactions]);

  const handleExport = () => {
    const reportData = filteredTransactions.map(tx => ({
        'İşlem ID': tx.id,
        'Tarih': new Date(tx.date).toLocaleDateString('tr-TR'),
        'Cari Adı': tx.contactName,
        'İşlem Tipi': tx.isReturn ? 'İADE (' + tx.type + ')' : tx.type,
        'Kalem Sayısı': tx.items.length,
        'Genel Toplam': tx.totalAmount.toFixed(2),
        'Personel': tx.user
    }));
    exportToCSV(reportData, `Islem_Raporu_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Filtreleme */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">İşlem Tipi</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="ALL">Tüm İşlemler</option>
              <option value={TransactionType.IN}>Alımlar</option>
              <option value={TransactionType.OUT}>Satışlar</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Başlangıç</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Bitiş</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm" />
          </div>
          <div className="flex space-x-2">
              <button onClick={() => { setFilterType('ALL'); setStartDate(''); setEndDate(''); }} className="px-4 py-3 text-slate-400 text-sm font-bold">Temizle</button>
              <button onClick={handleExport} className="px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg">Raporu Al (CSV)</button>
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl text-white flex flex-col justify-center border border-slate-800 shadow-xl">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Listelenen Hacim</p>
            <p className="text-2xl font-black text-blue-400">{formatCurrency(stats.total)}</p>
            <p className="text-[10px] text-slate-400 mt-2 font-bold">{stats.count} Kayıt</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                <th className="py-5 px-6">ID / Tarih</th>
                <th className="py-4 px-6">Cari Bilgisi</th>
                <th className="py-4 px-6">Özet</th>
                <th className="py-4 px-6">Tutar</th>
                <th className="py-4 px-6 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50/30 transition align-top">
                  <td className="py-4 px-6">
                    <p className="font-mono text-[10px] text-gray-400">#{tx.id}</p>
                    <p className="text-xs text-gray-600 font-bold">{new Date(tx.date).toLocaleDateString('tr-TR')}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-700">{tx.contactName}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{tx.type}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs text-gray-500">{tx.items.length} Kalem İşlem</p>
                  </td>
                  <td className="py-4 px-6 font-black text-gray-900">
                    {formatCurrency(tx.totalAmount)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                        onClick={() => setSelectedTx(tx)}
                        className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-600 hover:text-white transition"
                    >
                        Detay / Yazdır
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTx && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 print:hidden">
                    <h3 className="font-bold text-gray-800">İşlem Detayı / Makbuz</h3>
                    <div className="flex space-x-3">
                        <button onClick={handlePrint} className="px-6 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg hover:scale-105 transition">YAZDIR 🖨️</button>
                        <button onClick={() => setSelectedTx(null)} className="p-2 text-gray-400 hover:text-gray-600 transition">✕</button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 bg-white print:p-0" id="printable-invoice">
                    <style>{`
                        @media print {
                            body * { visibility: hidden; }
                            #printable-invoice, #printable-invoice * { visibility: visible; }
                            #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
                            .print-hidden { display: none !important; }
                        }
                    `}</style>

                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900">İŞLEM MAKBUZU</h2>
                            <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-bold"># {selectedTx.id}</p>
                        </div>
                        <div className="text-right">
                            {/* STATİK METİN YERİNE companyName PROP'U KULLANILDI */}
                            <p className="font-black text-slate-900 text-xl uppercase tracking-tighter leading-none">{companyName || 'KURUMSAL İŞLETME'}</p>
                            <p className="text-xs text-slate-500 mt-1">Operasyonel Kayıt Sistemi</p>
                            <p className="text-xs text-slate-500 mt-3 font-medium">{new Date(selectedTx.date).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MÜŞTERİ / MUHATAP</p>
                            <p className="text-xl font-black text-slate-900">{selectedTx.contactName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">İŞLEM TİPİ</p>
                            <p className="text-xl font-black text-slate-900">{selectedTx.type}</p>
                            <p className="text-xs text-slate-500 mt-1 font-bold">Düzenleyen: {selectedTx.user}</p>
                        </div>
                    </div>

                    <table className="w-full text-sm mb-12">
                        <thead>
                            <tr className="border-b-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase">
                                <th className="py-4 text-left">Açıklama</th>
                                <th className="py-4 text-center">Miktar</th>
                                <th className="py-4 text-right">Birim (KDV Hariç)</th>
                                <th className="py-4 text-right">KDV (%20)</th>
                                <th className="py-4 text-right">Toplam</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {selectedTx.items.map((item, idx) => {
                                const lineTotal = item.unitPrice * item.quantity * (1 - (item.discount || 0) / 100);
                                const lineExVAT = lineTotal / 1.2;
                                const lineVAT = lineTotal - lineExVAT;
                                
                                return (
                                    <tr key={idx}>
                                        <td className="py-4 font-bold text-slate-800">{item.productName}</td>
                                        <td className="py-4 text-center font-bold">{item.quantity}</td>
                                        <td className="py-4 text-right">{formatCurrency(lineExVAT / item.quantity)}</td>
                                        <td className="py-4 text-right text-slate-500">{formatCurrency(lineVAT)}</td>
                                        <td className="py-4 text-right font-black">{formatCurrency(lineTotal)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="flex justify-end">
                        <div className="w-72 space-y-3">
                            <div className="flex justify-between text-sm font-bold text-slate-500">
                                <span>Ara Toplam (KDV Hariç):</span>
                                <span>{formatCurrency(selectedTx.totalAmount / 1.2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-slate-500">
                                <span>KDV (%20) Toplamı:</span>
                                <span>{formatCurrency(selectedTx.totalAmount - (selectedTx.totalAmount / 1.2))}</span>
                            </div>
                            <div className="h-0.5 bg-slate-900 my-4"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-black text-slate-900">GENEL TOPLAM:</span>
                                <span className="text-2xl font-black text-slate-900">{formatCurrency(selectedTx.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-32 pt-8 border-t border-slate-100 text-[10px] text-slate-400 text-center italic font-bold">
                        Bu belge {companyName || 'İşletme'} operasyonel kayıtları üzerinden dijital olarak oluşturulmuştur.
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
