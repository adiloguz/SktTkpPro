
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  private dbName = 'MarketSKT_DB';
  private dbVersion = 2; // Version bumped for new 'categories' store
  private db: IDBDatabase | null = null;

  constructor() {}

  init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('Database error:', event);
        reject('Veritabanı açılamadı');
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products Store
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('barcode', 'barcode', { unique: false });
        }

        // Logs Store
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id' });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Categories Store (New in v2)
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
      };
    });
  }

  getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not initialized'); return; }
      
      const transaction = this.db.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  add<T>(storeName: string, item: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not initialized'); return; }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.add(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  put<T>(storeName: string, item: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not initialized'); return; }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  delete(storeName: string, id: string | number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not initialized'); return; }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  clear(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject('DB not initialized'); return; }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
