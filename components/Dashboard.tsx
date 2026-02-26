
import React from 'react';
import { Product, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/helpers';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ products, transactions }) => {
  const criticalProducts = products.filter(p => p.stock <= p.criticalThreshold);
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.pricing.purchasePrice * p.pricing.exchangeRate), 0);
  
  const lastMonthTxs = transactions.slice(0, 5);

  const categoryData = products.reduce((acc: any[], p) => {
    const existing = acc.find(item => item.name === p.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: p.category, value: 1 });
    }
    return acc;
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Toplam Ürün</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{products.length}</p>
          <p className="text-xs text-blue-500 mt-2">Aktif katalog ürünleri</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Kritik Stok</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-lg">⚠️</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{criticalProducts.length}</p>
          <p className="text-xs text-red-500 mt-2">Acil sipariş bekleyenler</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Toplam Stok Değeri</span>
            <span className="p-2 bg-green-50 text-green-600 rounded-lg">💰</span>
          </div>
          <p className="text-2xl font-bold text-gray-800 truncate">{formatCurrency(totalStockValue)}</p>
          <p className="text-xs text-green-500 mt-2">Muhasebe Değeri (KDV Hariç)</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">Son Hareketler</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">🔄</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{transactions.length}</p>
          <p className="text-xs text-amber-500 mt-2">Toplam işlem hacmi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2 text-red-500">🚨</span> Kritik Stok Uyarıları
          </h2>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {criticalProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-8 italic">Tüm stoklar güvenli seviyede.</p>
            ) : (
              criticalProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="font-bold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500">SKU: {p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold">{p.stock} {p.unit}</p>
                    <p className="text-[10px] text-gray-400">Eşik: {p.criticalThreshold}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Kategori Dağılımı</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Son İşlemler</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-xs uppercase font-semibold border-b border-gray-50">
                <th className="pb-3 px-2">Ürün</th>
                <th className="pb-3 px-2">Tip</th>
                <th className="pb-3 px-2">Miktar</th>
                <th className="pb-3 px-2">Kanal</th>
                <th className="pb-3 px-2">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lastMonthTxs.map(tx => (
                <tr key={tx.id} className="text-sm">
                  {/* Fix: Property 'productName' does not exist on type 'Transaction'. 
                      Extracting from the first item and adding count if multiple. */}
                  <td className="py-4 px-2 font-medium text-gray-700">
                    {tx.items.length > 0 ? (
                      tx.items.length === 1 ? tx.items[0].productName : `${tx.items[0].productName} (+${tx.items.length - 1})`
                    ) : 'İsimsiz İşlem'}
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      tx.type === TransactionType.IN ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  {/* Fix: Property 'quantity' does not exist on type 'Transaction'. Summing item quantities. */}
                  <td className="py-4 px-2 font-bold">
                    {tx.items.reduce((acc, item) => acc + item.quantity, 0)}
                  </td>
                  {/* Fix: Property 'source' does not exist on type 'Transaction'. Using contactName. */}
                  <td className="py-4 px-2 text-gray-500">{tx.contactName}</td>
                  <td className="py-4 px-2 text-gray-400">{new Date(tx.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
