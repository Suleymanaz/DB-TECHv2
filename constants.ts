
import { Product, Contact, ContactType, User, UserRole } from './types';

export const CATEGORIES = [
  'Aydınlatma',
  'Kablo',
  'Şalt Grubu',
  'Anahtar & Priz',
  'Tesisat',
  'İşçilik',
  'Diğer'
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
    name: 'NYM Kablo 3x2.5mm 100m',
    sku: 'KAB-001-NYM',
    category: 'Kablo',
    unit: 'Metre',
    stock: 450,
    criticalThreshold: 200,
    pricing: {
      purchasePrice: 15.50,
      vatRate: 0.20,
      exchangeRate: 31.20,
      otherExpenses: 250.00
    },
    sellingPrice: 28.50
  },
  {
    id: '2',
    name: 'LED Panel 60x60 54W',
    sku: 'AYD-LED-6060',
    category: 'Aydınlatma',
    unit: 'Adet',
    stock: 12,
    criticalThreshold: 25,
    pricing: {
      purchasePrice: 8.20,
      vatRate: 0.20,
      exchangeRate: 31.20,
      otherExpenses: 50.00
    },
    sellingPrice: 15.00
  }
];
