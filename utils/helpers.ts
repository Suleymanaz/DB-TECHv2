
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
  
  const headers = Object.keys(data[0]);
  
  const escapeCSVValue = (val: any) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    // If it contains double quotes, commas, or newlines, wrap it in double quotes and escape internal double quotes
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCSVValue).join(',');
  const rowStrings = data.map(obj => {
    return headers.map(h => escapeCSVValue(obj[h])).join(',');
  });
  
  // uFEFF is the UTF-8 BOM to ensure Turkish characters and columns are parsed correctly by Excel
  const csvContent = '\uFEFF' + [headerRow, ...rowStrings].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
