
import React, { useState, useMemo } from 'react';
import { Transaction, Expense, TransactionType, Product } from '../types';
import { formatCurrency } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FinancialReportsProps {
  transactions: Transaction[];
  expenses: Expense[];
  products: Product[];
}

const FinancialReports: React.FC<FinancialReportsProps> = ({ transactions, expenses, products }) => {
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

    // Toplam Gelir ve Alımlar (KDV Dahil)
    const totalSales = txs.filter(t => t.type === TransactionType.OUT).reduce((sum, t) => sum + (t.isReturn ? -t.totalAmount : t.totalAmount), 0);
    const totalInventoryPurchases = txs.filter(t => t.type === TransactionType.IN).reduce((sum, t) => sum + (t.isReturn ? -t.totalAmount : t.totalAmount), 0);
    const totalExpenses = exps.reduce((sum, e) => sum + e.amount, 0);

    // Satılan Ürünlerin Maliyeti (COGS) hesaplama
    let totalCOGSExVAT = 0;
    let laborItemTotal = 0;

    txs.filter(t => t.type === TransactionType.OUT).forEach(t => {
      const sign = t.isReturn ? -1 : 1;
      t.items.forEach(item => {
        if (item.isLabor) {
          // Hizmet/İşçillik bedelleri maliyetsiz kabul edilir (ya da isterseniz burada kaydedilen başka bir maliyet varsa)
          laborItemTotal += sign * (item.unitPrice * item.quantity);
          return;
        }

        let unitCost = 0;
        if (item.costPrice !== undefined) {
          unitCost = item.costPrice;
        } else if (item.productId) {
          const prod = products.find(p => p.id === item.productId);
          if (prod) {
            unitCost = prod.pricing.purchasePrice * prod.pricing.exchangeRate;
          }
        }

        totalCOGSExVAT += sign * (unitCost * item.quantity);
      });
    });

    // Satılan ürün maliyetinde %20 KDV ekleme (KDV dahil çevrim)
    const totalCOGSWithVAT = totalCOGSExVAT * 1.20;

    // Brüt Ticari Kâr = Toplam Gelir - Satılan Ürünlerin Toplam KDVli Maliyeti
    const grossProfit = totalSales - totalCOGSWithVAT;

    // Net Kâr (Nakit-Akış Bilançosu) = Toplam Gelir - (Stok Alımı + Genel Giderler)
    const netProfit = totalSales - (totalInventoryPurchases + totalExpenses);

    return { 
      totalSales, 
      totalInventoryPurchases, 
      totalExpenses, 
      totalCOGSWithVAT,
      totalCOGSExVAT,
      grossProfit,
      netProfit, 
      laborItemTotal,
      txCount: txs.length, 
      expCount: exps.length 
    };
  }, [transactions, expenses, products, dateRange]);

  const chartData = [
    { name: 'Gelirler (Satış)', value: filteredData.totalSales, color: '#3B82F6' },
    { name: 'Satılan Ürün Mal.', value: filteredData.totalCOGSWithVAT, color: '#F59E0B' },
    { name: 'Brüt Ticari Kâr', value: filteredData.grossProfit, color: '#10B981' },
    { name: 'Yeni Stok Alımı', value: filteredData.totalInventoryPurchases, color: '#6366F1' },
    { name: 'Genel Giderler', value: filteredData.totalExpenses, color: '#EF4444' }
  ];

  const grossProfitMargin = filteredData.totalSales > 0 
    ? ((filteredData.grossProfit / filteredData.totalSales) * 100).toFixed(1) 
    : '0';

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

      {/* Bölüm 1: Ticari Kârlılık Paneli (Brüt Kar Analizi) */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
          <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Ticari Başarı & Brüt Kârlılık (Ürün Bazlı)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">TOPLAM GELİR (KDV DAHİL)</p>
            <h3 className="text-3xl font-black text-slate-800">{formatCurrency(filteredData.totalSales)}</h3>
            <p className="text-[10px] text-slate-400 mt-2 font-bold">{filteredData.txCount} Satış & Sipariş Hacmi</p>
            <span className="absolute right-6 top-6 text-2xl opacity-10">📈</span>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">SATILAN ÜRÜN MALİYETİ (KDV DAHİL)</p>
            <h3 className="text-3xl font-black text-slate-800">{formatCurrency(filteredData.totalCOGSWithVAT)}</h3>
            <p className="text-[10px] text-slate-400 mt-2 font-bold">
              KDV Hariç Maliyet: {formatCurrency(filteredData.totalCOGSExVAT)} (+%20 KDV)
            </p>
            <span className="absolute right-6 top-6 text-2xl opacity-10">🏷️</span>
          </div>

          <div className={`p-8 rounded-[2rem] shadow-sm border ${filteredData.grossProfit >= 0 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950' : 'bg-rose-50/50 border-rose-100 text-rose-950'} relative overflow-hidden`}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2">BRÜT TİCARİ KÂR</p>
            <h3 className="text-3xl font-black">{formatCurrency(filteredData.grossProfit)}</h3>
            <p className={`text-[10px] mt-2 font-bold ${filteredData.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Brüt Kâr Marjı: %{grossProfitMargin}
            </p>
            <span className="absolute right-6 top-6 text-2xl opacity-20">{filteredData.grossProfit >= 0 ? '💸' : '⚠️'}</span>
          </div>
        </div>
      </div>

      {/* Bölüm 2: Nakit Akışı & Genel Durum (Bilanço) */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
          <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span> Nakit Pool & Dönem Sonu Genel Bilanço
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">YENİ STOK ALIM GİDERİ</p>
            <h3 className="text-3xl font-black text-slate-800">{formatCurrency(filteredData.totalInventoryPurchases)}</h3>
            <p className="text-[10px] text-slate-400 mt-2 font-bold">Dönem İçi Depo Alımları</p>
            <span className="absolute right-6 top-6 text-2xl opacity-10">📥</span>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">GENEL İŞLETME GİDERLERİ</p>
            <h3 className="text-3xl font-black text-slate-800">{formatCurrency(filteredData.totalExpenses)}</h3>
            <p className="text-[10px] text-slate-400 mt-2 font-bold">{filteredData.expCount} Masraf & Operasyon Gideri</p>
            <span className="absolute right-6 top-6 text-2xl opacity-10">🧾</span>
          </div>

          <div className={`p-8 rounded-[2rem] shadow-xl border-4 ${filteredData.netProfit >= 0 ? 'bg-slate-900 border-indigo-500 text-white' : 'bg-red-950 border-red-500 text-white'} relative overflow-hidden`}>
            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">GENEL NET BİLANÇO (KASA AKIŞI)</p>
            <h3 className="text-3.5xl font-black tracking-tighter">{formatCurrency(filteredData.netProfit)}</h3>
            <p className="text-[10px] mt-2 font-bold uppercase">{filteredData.netProfit >= 0 ? 'İşletme Kârda 🚀' : 'İşletme Zararda ⚠️'}</p>
            <span className="absolute right-6 top-6 text-2xl opacity-20">📊</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grafik Bölümü */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8">Nakit & Karlılık Karşılaştırma Grafiği</h3>
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
                <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={45}>
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
            <h3 className="text-lg font-black mb-8 border-b border-slate-800 pb-4">Finansal Verimlilik rasyoları</h3>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Satılan Ürün Maliyet Oranı:</span>
                    <span className="font-black text-xl">
                        %{filteredData.totalSales > 0 ? ((filteredData.totalCOGSWithVAT / filteredData.totalSales) * 100).toFixed(1) : '0'}
                    </span>
                </div>
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, filteredData.totalSales > 0 ? ((filteredData.totalCOGSWithVAT / filteredData.totalSales) * 100) : 0)}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center pt-2">
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
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-slate-400">Satılan Ürün Maliyeti (COGS):</span>
                        <span className="font-bold ml-auto">{formatCurrency(filteredData.totalCOGSWithVAT)}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-400">Brüt Ticari Margin (Kâr):</span>
                        <span className="font-bold ml-auto">{formatCurrency(filteredData.grossProfit)}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs pt-2 border-t border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-slate-400">Stok Alım Giderleri:</span>
                        <span className="font-bold ml-auto">{formatCurrency(filteredData.totalInventoryPurchases)}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-slate-400">İşletme Genel Giderleri:</span>
                        <span className="font-bold ml-auto">{formatCurrency(filteredData.totalExpenses)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-12 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Mali Tavsiye & Analiz</p>
                <p className="text-xs text-slate-300 italic">
                  {filteredData.grossProfit > 0 
                    ? `Brüt kâr marjınız %${grossProfitMargin}. Satışlar üzerindeki kâr gücünüz sağlıklı seviyede.` 
                    : "Ürünlerinizin brüt kârlılığı zayıf. Alış fiyatlarınızı gözden geçirebilir veya satış fiyalarını güncelleyebilirsiniz."}
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
