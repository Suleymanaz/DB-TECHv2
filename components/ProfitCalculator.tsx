
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { calculateUnitCost, formatCurrency } from '../utils/helpers';

interface ProfitCalculatorProps {
  products: Product[];
}

const COMMISSIONS: Record<string, number> = {
  'Mağaza': 0.00,
  'Trendyol': 0.20,
  'Hepsiburada': 0.18,
  'N11': 0.15
};

const ProfitCalculator: React.FC<ProfitCalculatorProps> = ({ products }) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState('Trendyol');

  const product = products.find(p => p.id === selectedProductId);
  const unitCost = product ? calculateUnitCost(product.pricing) : 0;
  
  const commissionRate = COMMISSIONS[selectedChannel] || 0;
  const commissionAmount = sellingPrice * commissionRate;
  const netProfit = sellingPrice - commissionAmount - unitCost;
  const profitMargin = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

  useEffect(() => {
    if (product && sellingPrice === 0) {
      setSellingPrice(unitCost * 1.5); // Default to 50% markup initial suggestion
    }
  }, [product, unitCost, sellingPrice]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="mr-3 p-3 bg-blue-100 rounded-2xl">💰</span> Kâr Simülasyonu
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Ürün Seçin</label>
              <select 
                className="w-full p-4 rounded-2xl bg-gray-50 border-gray-100 text-lg font-medium outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSellingPrice(0);
                }}
              >
                <option value="">Seçiniz...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Hedef Satış Fiyatı (TL)</label>
              <div className="relative">
                <input 
                  type="number"
                  className="w-full p-4 rounded-2xl bg-gray-50 border-gray-100 text-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                />
                <span className="absolute right-4 top-5 font-bold text-gray-400">₺</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2 uppercase">Satış Kanalı</label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(COMMISSIONS).map(channel => (
                  <button
                    key={channel}
                    onClick={() => setSelectedChannel(channel)}
                    className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all border ${
                      selectedChannel === channel 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' 
                        : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                    }`}
                  >
                    {channel} (%{COMMISSIONS[channel] * 100})
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 flex flex-col justify-between shadow-2xl">
            <div>
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Maliyet Analizi</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Ürün Maliyeti:</span>
                  <span className="font-bold">{formatCurrency(unitCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Pazaryeri Komisyonu:</span>
                  <span className="font-bold text-red-400">-{formatCurrency(commissionAmount)}</span>
                </div>
                <div className="h-px bg-slate-800 my-4"></div>
                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold">Net Kâr:</span>
                  <span className={`font-black ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black">Net Kâr Marjı</p>
                  <p className="text-3xl font-black text-blue-400">%{profitMargin.toFixed(1)}</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center relative">
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-400"
                    style={{ 
                      clipPath: `polygon(50% 50%, -50% -50%, ${profitMargin > 25 ? '150% -50%' : '50% -50%'}, ${profitMargin > 50 ? '150% 150%' : '50% 150%'}, ${profitMargin > 75 ? '-50% 150%' : '50% 150%'}, -50% -50%)`,
                      transform: `rotate(${profitMargin * 3.6}deg)`
                    }}
                  ></div>
                  <span className="text-xs">ROI</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-4 leading-relaxed italic">
                * Bu hesaplama genel ortalamaları baz alır. Lojistik ve iade maliyetleri dahil edilmemiştir.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Simulation Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Maliyet Formülü</p>
          <p className="text-sm text-gray-600 italic">
            (Alış × Kur) × (1 + KDV) + Giderler
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Kâr Hesaplama</p>
          <p className="text-sm text-gray-600 italic">
            Satış - Komisyon - Maliyet
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100">
          <p className="text-xs text-gray-400 uppercase font-bold mb-1">Vergi Notu</p>
          <p className="text-sm text-gray-600 italic">
            KDV giriş maliyetine dahil edilmiştir.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfitCalculator;
