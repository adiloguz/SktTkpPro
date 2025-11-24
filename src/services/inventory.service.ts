
import { Injectable, signal, computed, inject } from '@angular/core';
import { Product, ExpiryStatus, ActionLog, AppSettings, Category, BackupData, DEFAULT_CATEGORIES } from '../models';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private db = inject(DbService);

  // Main state
  readonly products = signal<Product[]>([]);
  readonly logs = signal<ActionLog[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly settings = signal<AppSettings>({ warningThresholdDays: 7 });
  readonly isInitialized = signal(false);
  
  // Computed stats
  readonly totalProducts = computed(() => this.products().length);
  readonly totalStock = computed(() => this.products().reduce((acc, p) => acc + p.quantity, 0));
  readonly totalValue = computed(() => this.products().reduce((acc, p) => acc + (p.price * p.quantity), 0));
  
  // Helper to just get category names for UI lists
  readonly categoryNames = computed(() => this.categories().map(c => c.name));

  readonly expiredProducts = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.products()
      .filter(p => p.expiryDate < today)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  });

  readonly warningProducts = computed(() => {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + this.settings().warningThresholdDays);
    
    const todayStr = today.toISOString().split('T')[0];
    const thresholdStr = thresholdDate.toISOString().split('T')[0];

    return this.products()
      .filter(p => p.expiryDate >= todayStr && p.expiryDate <= thresholdStr)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  });

  constructor() {
    this.initData();
  }

  private async initData() {
    try {
      await this.db.init();
      
      // Load Settings
      const settings = await this.db.getAll<AppSettings>('settings');
      if (settings.length > 0) {
        this.settings.set(settings[0]);
      } else {
        await this.db.put('settings', { id: 1, warningThresholdDays: 7 });
      }

      // Load Categories (or init default if empty)
      const categories = await this.db.getAll<Category>('categories');
      if (categories.length > 0) {
        this.categories.set(categories);
      } else {
        // Init default categories
        for (const name of DEFAULT_CATEGORIES) {
          const cat: Category = { id: crypto.randomUUID(), name };
          await this.db.add('categories', cat);
        }
        this.categories.set(await this.db.getAll<Category>('categories'));
      }

      // Load Products
      const products = await this.db.getAll<Product>('products');
      this.products.set(products); 

      // Load Logs
      const logs = await this.db.getAll<ActionLog>('logs');
      this.logs.set(logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      this.isInitialized.set(true);
    } catch (err) {
      console.error('Failed to initialize DB', err);
    }
  }

  // --- Category Actions ---

  async addCategory(name: string) {
    if (this.categories().some(c => c.name.toLowerCase() === name.toLowerCase())) return;

    const newCat: Category = { id: crypto.randomUUID(), name };
    await this.db.add('categories', newCat);
    this.categories.update(current => [...current, newCat]);
    await this.addLog('system', `Kategori eklendi: "${name}"`);
  }

  async removeCategory(id: string) {
    const cat = this.categories().find(c => c.id === id);
    if (!cat) return;

    await this.db.delete('categories', id);
    this.categories.update(current => current.filter(c => c.id !== id));
    await this.addLog('system', `Kategori silindi: "${cat.name}"`);
  }

  // --- Product Actions ---

  async addProduct(product: Omit<Product, 'id' | 'addedDate'>) {
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      addedDate: new Date().toISOString()
    };
    
    await this.db.add('products', newProduct);
    this.products.update(current => [newProduct, ...current]);
    await this.addLog('add', `"${newProduct.name}" eklendi. (Stok: ${newProduct.quantity})`, newProduct.name);
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    const currentProduct = this.products().find(p => p.id === id);
    if (!currentProduct) return;

    const updatedProduct = { ...currentProduct, ...updates };
    
    await this.db.put('products', updatedProduct);
    this.products.update(current => 
      current.map(p => p.id === id ? updatedProduct : p)
    );
    await this.addLog('update', `"${updatedProduct.name}" güncellendi.`, updatedProduct.name);
  }

  async removeProduct(id: string) {
    const product = this.products().find(p => p.id === id);
    if (!product) return;

    await this.db.delete('products', id);
    this.products.update(current => current.filter(p => p.id !== id));
    await this.addLog('delete', `"${product.name}" silindi.`, product.name);
  }

  async bulkRemove(ids: string[]) {
    const count = ids.length;
    for (const id of ids) {
      await this.db.delete('products', id);
    }
    this.products.update(current => current.filter(p => !ids.includes(p.id)));
    await this.addLog('delete', `${count} adet ürün toplu silindi.`);
  }

  // --- Settings & System Actions ---

  async updateSettings(newSettings: AppSettings) {
    const settingsToSave = { ...newSettings, id: 1 };
    await this.db.put('settings', settingsToSave);
    this.settings.set(settingsToSave);
    await this.addLog('system', `Ayarlar güncellendi. Uyarı süresi: ${newSettings.warningThresholdDays} gün.`);
  }

  async clearLogs() {
    await this.db.clear('logs');
    this.logs.set([]);
  }

  // --- Backup & Restore ---

  async createBackup(): Promise<string> {
    const backup: BackupData = {
      products: await this.db.getAll<Product>('products'),
      categories: await this.db.getAll<Category>('categories'),
      settings: await this.db.getAll<AppSettings>('settings'),
      logs: await this.db.getAll<ActionLog>('logs'),
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
    return JSON.stringify(backup);
  }

  async restoreBackup(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          const backup: BackupData = JSON.parse(json);

          if (!backup.products || !backup.categories) {
            throw new Error('Geçersiz yedek dosyası formatı.');
          }

          // Clear existing data
          await this.db.clear('products');
          await this.db.clear('categories');
          await this.db.clear('settings');
          await this.db.clear('logs');

          // Restore Categories
          for (const cat of backup.categories) {
            await this.db.add('categories', cat);
          }

          // Restore Settings
          for (const s of backup.settings) {
            await this.db.put('settings', s);
          }

          // Restore Logs
          for (const l of backup.logs) {
            await this.db.add('logs', l);
          }

          // Restore Products
          for (const p of backup.products) {
            await this.db.add('products', p);
          }
          
          // Re-initialize app state to reflect changes
          await this.initData();
          resolve(true);

        } catch (err) {
          console.error('Restore error', err);
          reject(err);
        }
      };
      reader.onerror = () => reject('Dosya okunamadı');
      reader.readAsText(file);
    });
  }

  // --- Helpers ---

  private async addLog(action: ActionLog['action'], description: string, productName?: string) {
    const log: ActionLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      action,
      description,
      productName
    };
    await this.db.add('logs', log);
    this.logs.update(current => [log, ...current].slice(0, 100));
  }

  getExpiryStatus(dateStr: string): ExpiryStatus {
    const today = new Date().toISOString().split('T')[0];
    const thresholdDate = new Date();
    thresholdDate.setDate(new Date().getDate() + this.settings().warningThresholdDays);
    const thresholdStr = thresholdDate.toISOString().split('T')[0];

    if (dateStr < today) return 'expired';
    if (dateStr <= thresholdStr) return 'warning';
    return 'good';
  }

  getDaysRemaining(dateStr: string): number {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }
}
