
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { exportToCSV, formatCurrency } from '../utils/helpers';

interface TransactionsProps {
  transactions: Transaction[];
}

const Transactions: React.FC<TransactionsProps> = ({ transactions }) => {
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const handleExport = () => {
    const reportData = filteredTransactions.map(tx => ({
        'İşlem ID': tx.id,
        'Tarih': new Date(tx.date).toLocaleDateString('tr-TR'),
        'Cari Adı': tx.contactName,
        'İşlem Tipi': tx.isReturn ? 'İADE (' + tx.type + ')' : tx.type,
        'Kalem Sayısı': tx.items.length,
        'Toplam Tutar': tx.totalAmount.toFixed(2),
        'Personel': tx.user
    }));
    exportToCSV(reportData, `Islem_Raporu_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Filtreleme Paneli */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">İşlem Tipi</label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tüm İşlemler</option>
            <option value={TransactionType.IN}>Sadece Alımlar</option>
            <option value={TransactionType.OUT}>Sadece Satışlar</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Başlangıç</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bitiş</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex space-x-2">
            <button 
                onClick={() => { setFilterType('ALL'); setStartDate(''); setEndDate(''); }}
                className="px-4 py-3 text-slate-400 hover:text-slate-600 text-sm font-bold"
            >
                Temizle
            </button>
            <button 
              onClick={handleExport}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition flex items-center"
            >
              <span className="mr-2">📊</span> Filtreli Raporu Al (CSV)
            </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                <th className="py-5 px-6">ID / Tarih</th>
                <th className="py-4 px-6">Cari (Müşteri/Tedarikçi)</th>
                <th className="py-4 px-6">İşlem İçeriği</th>
                <th className="py-4 px-6">Tip</th>
                <th className="py-4 px-6 text-right">Mali Detay</th>
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
                    <p className="text-[10px] text-gray-400 uppercase">İşleyen: {tx.user}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      {tx.items.map((item, idx) => {
                        const itemSubtotal = item.unitPrice * item.quantity;
                        const itemDiscounted = item.discount ? itemSubtotal * (1 - item.discount / 100) : itemSubtotal;
                        return (
                          <div key={idx} className="text-[11px] flex flex-col border-b border-gray-50 pb-1 mb-1">
                            <div className="flex justify-between space-x-4">
                                <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                                <span className="font-bold text-gray-800">{formatCurrency(itemDiscounted)}</span>
                            </div>
                            {item.discount && <span className="text-[9px] text-orange-500 font-bold uppercase">% {item.discount} İndirim</span>}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-tighter ${
                      tx.type === TransactionType.IN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.isReturn ? 'İADE (' + tx.type + ')' : tx.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {tx.totalDiscount > 0 && (
                        <p className="text-[10px] text-orange-500 font-bold">-{formatCurrency(tx.totalDiscount)}</p>
                    )}
                    <p className="font-black text-gray-900 text-lg leading-tight">
                        {formatCurrency(tx.totalAmount)}
                    </p>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-400 italic">Kriterlere uygun bir işlem kaydı bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
