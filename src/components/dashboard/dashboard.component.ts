
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../services/inventory.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent {
  inventory = inject(InventoryService);
  
  // Angular DatePipe yerine tarayıcının native tarih formatını kullanıyoruz.
  // Bu sayede "Missing locale data for 'tr'" hatası oluşmaz.
  readonly currentDateStr = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });
  
  // İstatistikleri sinyallerden okuyan yardımcılar
  get totalProducts() { return this.inventory.totalProducts(); }
  get warningCount() { return this.inventory.warningProducts().length; }
  get expiredCount() { return this.inventory.expiredProducts().length; }
  get totalValueStr() { return `₺${this.inventory.totalValue().toLocaleString('tr-TR')}`; }

  stats = [
    { 
      title: 'Toplam Ürün', 
      value: this.totalProducts, 
      icon: 'box', 
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    { 
      title: 'Kritik Stok (SKT < 7 Gün)', 
      value: this.warningCount, 
      icon: 'warning', 
      color: 'bg-amber-500',
      textColor: 'text-amber-500'
    },
    { 
      title: 'Son Kullanma Tarihi Geçen', 
      value: this.expiredCount, 
      icon: 'expired', 
      color: 'bg-red-500',
      textColor: 'text-red-500'
    },
    { 
      title: 'Toplam Stok Değeri', 
      value: this.totalValueStr, 
      icon: 'money', 
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500'
    }
  ];

  // Helper to get short date
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  }
}
