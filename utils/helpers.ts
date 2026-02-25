
import { Pricing } from '../types';

/**
 * BirimMaliyet = (AlisFiyati * DovizKuru) * (1 + KDV) + DigerGiderler
 */
export const calculateUnitCost = (pricing: Pricing): number => {
  const { purchasePrice, exchangeRate, vatRate, otherExpenses } = pricing;
  const subTotal = purchasePrice * exchangeRate;
  const withVAT = subTotal * (1 + vatRate);
  return withVAT + otherExpenses;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
  const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
