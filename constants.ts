
import { Product, Contact, ContactType, User, UserRole } from './types';

export const CATEGORIES = [
  'Genel Ürünler',
  'Hammadde',
  'Yarı Mamul',
  'Sarf Malzeme',
  'Ticari Mal',
  'Hizmet / İşçilik',
  'Demirbaş',
  'Diğer'
];

export const UNITS = [
  'Adet',
  'Metre',
  'Kg',
  'Gram',
  'Paket',
  'Litre',
  'Rulo',
  'Takım',
  'Koli',
  'Çuval',
  'Palet'
];

export const SYSTEM_USERS: User[] = [
  { id: 'u1', name: 'Caner Öz', username: 'admin', password: '123', role: UserRole.ADMIN },
  { id: 'u2', name: 'Ahmet Yılmaz', username: 'satinalma', password: '123', role: UserRole.PURCHASE },
  { id: 'u3', name: 'Mehmet Demir', username: 'satis', password: '123', role: UserRole.SALES }
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c1',
    name: 'HIZLI SATIŞ PERAKENDE',
    type: ContactType.CUSTOMER,
    phone: '-',
    address: 'Mağaza'
  },
  {
    id: 's1',
    name: 'Özlem Elektrik Toptan',
    type: ContactType.SUPPLIER,
    phone: '0212 000 00 00',
    address: 'Karaköy'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Örnek Ürün A',
    sku: 'SKU-001',
    category: 'Genel Ürünler',
    unit: 'Adet',
    stock: 100,
    criticalThreshold: 20,
    pricing: {
      purchasePrice: 10.00,
      vatRate: 0.20,
      exchangeRate: 1,
      otherExpenses: 0
    },
    sellingPrice: 15.00
  }
];
