
export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  price: number;
  supplier?: string;
  image?: string; // Base64 string for the product image
  addedDate: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface ActionLog {
  id: string;
  date: string;
  action: 'add' | 'update' | 'delete' | 'system';
  description: string;
  productName?: string;
}

export interface AppSettings {
  id?: number; // IndexedDB key (usually 1)
  warningThresholdDays: number; // Default 7
}

export interface BackupData {
  products: Product[];
  categories: Category[];
  settings: AppSettings[];
  logs: ActionLog[];
  exportDate: string;
  version: string;
}

export type ExpiryStatus = 'good' | 'warning' | 'expired';

export const DEFAULT_CATEGORIES = [
  'Süt & Kahvaltılık',
  'Et & Şarküteri',
  'Meyve & Sebze',
  'İçecekler',
  'Bakliyat & Makarna',
  'Atıştırmalık',
  'Temizlik',
  'Kişisel Bakım',
  'Diğer'
];
