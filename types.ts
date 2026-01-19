
export enum TransactionType {
  IN = 'ALIM',
  OUT = 'SATIŞ'
}

export enum ContactType {
  CUSTOMER = 'MÜŞTERİ',
  SUPPLIER = 'TEDARİKÇİ'
}

export enum UserRole {
  SUPER_ADMIN = 'DB_TECH_ADMIN', // Platform Yöneticisi
  ADMIN = 'YÖNETİCİ',
  PURCHASE = 'SATIN ALMA',
  SALES = 'SATIŞ'
}

export interface User {
  id: string;
  name: string;
  username: string; 
  password?: string;
  role: UserRole;
  avatar?: string;
  companyId?: string; // SaaS Tenant ID
}

export interface Tenant {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  phone?: string;
  address?: string;
}

export interface TransactionItem {
  productId?: string; // Empty for labor
  productName: string;
  quantity: number;
  unitPrice: number;
  isLabor?: boolean;
}

export interface Pricing {
  purchasePrice: number;
  vatRate: number;
  exchangeRate: number;
  otherExpenses: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: number;
  criticalThreshold: number;
  pricing: Pricing;
  sellingPrice: number;
}

export interface Transaction {
  id: string;
  items: TransactionItem[];
  type: TransactionType;
  contactId: string;
  contactName: string;
  totalAmount: number;
  date: string;
  user: string;
  isReturn?: boolean;
}
