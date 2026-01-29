
import React, { useState, useMemo } from 'react';
import { Transaction, Expense, TransactionType } from '../types';
import { formatCurrency } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FinancialReportsProps {
  transactions: Transaction[];
  expenses: Expense[];
}

const FinancialReports: React.FC<FinancialReportsProps> = ({ transactions, expenses }) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredData = useMemo(() => {
    const filterByDate = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      if (dateRange.start) {
        const s = new Date(dateRange.start);
        s.setHours(0,0,0,0);
        if (d < s) return false;
      }
      if (dateRange.end) {
        const e = new Date(dateRange.end);
        e.setHours(0,0,0,0);
        if (d > e) return false;
      }
      return true;
    };

    const txs = transactions.filter(t => filterByDate(t.date));
    const exps = expenses.filter(e => filterByDate(e.date));

    const totalSales = txs.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalInventoryPurchases = txs.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = exps.reduce((sum, e) => sum + e.amount, 0);

    const netProfit = totalSales - (totalInventoryPurchases + totalExpenses);

    return { totalSales, totalInventoryPurchases, totalExpenses, netProfit, txCount: txs.length, expCount: exps.length };
  }, [transactions, expenses, dateRange]);

  const chartData = [
    { name: 'Gelirler (Satış)', value: filteredData.totalSales, color: '#3B82F6' },
    { name: 'Stok Alımı', value: filteredData.totalInventoryPurchases, color: '#10B981' },
    { name: 'Masraflar', value: filteredData.totalExpenses, color: '#EF4444' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filtre Paneli */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Başlangıç Tarihi</label>
          <input type="date" className="w-full p-3 rounded-xl border border-slate-200 outline-none" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bitiş Tarihi</label>
          <input type="date" className="w-full p-3 rounded-xl border border-slate-200 outline-none" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
        </div>
        <button onClick={() => setDateRange({start: '', end: ''})} className="px-6 py-3 bg-slate-50 text-slate-400 font-bold rounded-xl border border-slate-100 hover:bg-slate-100 transition">Sıfırla</button>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">TOPLAM GELİR</p>
          <h3 className="text-3xl font-black text-slate-800">{formatCurrency(filteredData.totalSales)}</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">{filteredData.txCount} Satış İşlemi</p>
        </div>
        
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">STOK GİDERİ</p>
          <h3 className="text-3xl font-black text-slate-800">{formatCurrency(filteredData.totalInventoryPurchases)}</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">Mal Alımları</p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">GENEL GİDERLER</p>
          <h3 className="text-3xl font-black text-slate-800">{formatCurrency(filteredData.totalExpenses)}</h3>
          <p className="text-[10px] text-slate-400 mt-2 font-bold">{filteredData.expCount} Masraf Kaydı</p>
        </div>

        <div className={`p-8 rounded-[2rem] shadow-xl border-4 ${filteredData.netProfit >= 0 ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-red-900 border-red-500 text-white'}`}>
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">NET DURUM (BİLANÇO)</p>
          <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(filteredData.netProfit)}</h3>
          <p className="text-[10px] mt-2 font-bold uppercase">{filteredData.netProfit >= 0 ? 'İşletme Kârda 🚀' : 'İşletme Zararda ⚠️'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grafik Bölümü */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Nakit Akış Analizi</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                   cursor={{fill: '#f8fafc'}}
                   contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                   formatter={(value: number) => [formatCurrency(value), 'Tutar']}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Özet Listesi */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-black mb-8 border-b border-slate-800 pb-4">Finansal Verimlilik</h3>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Gider/Gelir Oranı:</span>
                    <span className="font-black text-xl">
                        %{filteredData.totalSales > 0 ? (((filteredData.totalInventoryPurchases + filteredData.totalExpenses) / filteredData.totalSales) * 100).toFixed(1) : '0'}
                    </span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, filteredData.totalSales > 0 ? (((filteredData.totalInventoryPurchases + filteredData.totalExpenses) / filteredData.totalSales) * 100) : 0)}%` }}
                    ></div>
                </div>
                
                <div className="pt-8 border-t border-slate-800 mt-8 space-y-4">
                    <div className="flex items-center space-x-3 text-xs">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-slate-400">Brüt Satış Geliri:</span>
                        <span className="font-bold ml-auto">{formatCurrency(filteredData.totalSales)}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-slate-400">Toplam Gider Yükü:</span>
                        <span className="font-bold ml-auto">{formatCurrency(filteredData.totalInventoryPurchases + filteredData.totalExpenses)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-12 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Mali Tavsiye</p>
                <p className="text-xs text-slate-300 italic">
                    {filteredData.netProfit > 0 
                      ? "Mevcut periyotta işletmeniz sağlıklı bir kâr marjına sahip. Stok devir hızınızı artırmaya odaklanabilirsiniz." 
                      : "Gider kalemleriniz gelirlerinizi aşıyor. Masraf kategorilerini inceleyerek tasarruf alanları belirlemeniz önerilir."}
                </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32"></div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
