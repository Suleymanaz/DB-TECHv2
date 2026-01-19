
import React from 'react';
import { Transaction, TransactionType } from '../types';
import { exportToCSV, formatCurrency } from '../utils/helpers';

interface TransactionsProps {
  transactions: Transaction[];
}

const Transactions: React.FC<TransactionsProps> = ({ transactions }) => {
  const handleExport = () => {
    exportToCSV(transactions, 'voltflow-islem-gecmisi');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="font-bold text-gray-700">Son Hareketler</h2>
        <button 
          onClick={handleExport}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition"
        >
          Dışa Aktar (CSV)
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs uppercase font-semibold border-b border-gray-100">
                <th className="py-4 px-6">ID / Tarih</th>
                <th className="py-4 px-6">Cari (Müşteri/Tedarikçi)</th>
                <th className="py-4 px-6">İşlem İçeriği</th>
                <th className="py-4 px-6">Tip</th>
                <th className="py-4 px-6">Toplam Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50/30 transition align-top">
                  <td className="py-4 px-6">
                    <p className="font-mono text-[10px] text-gray-400">#{tx.id}</p>
                    <p className="text-xs text-gray-600">{new Date(tx.date).toLocaleDateString('tr-TR')}</p>
                    <p className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleTimeString('tr-TR')}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="font-bold text-gray-700">{tx.contactName}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      {tx.items.map((item, idx) => (
                        <div key={idx} className="text-xs flex justify-between space-x-4 border-b border-gray-50 pb-1">
                          <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                          <span className="font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      tx.type === TransactionType.IN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.isReturn ? 'İADE (' + tx.type + ')' : tx.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-black text-gray-800">
                    {formatCurrency(tx.totalAmount)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-400 italic">Henüz bir işlem kaydı bulunmuyor.</td>
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
