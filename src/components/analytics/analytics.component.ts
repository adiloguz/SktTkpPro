
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent {
  inventory = inject(InventoryService);
  
  // --- Bar Chart Logic (Stok Değeri) ---
  readonly barChartData = computed(() => {
    const products = this.inventory.products();
    if (products.length === 0) return [];

    const categoryMap = new Map<string, number>();
    products.forEach(p => {
      const val = p.price * p.quantity;
      categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + val);
    });

    const data = Array.from(categoryMap, ([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value); // En yüksekten en düşüğe

    const maxValue = Math.max(...data.map(d => d.value));

    // Yüzdelik hesapla (CSS height için)
    return data.map(d => ({
      ...d,
      heightPercent: maxValue > 0 ? (d.value / maxValue) * 100 : 0
    }));
  });

  // --- Donut Chart Logic (SKT Durumu) ---
  readonly pieChartStats = computed(() => {
    const products = this.inventory.products();
    let good = 0, warning = 0, expired = 0;

    products.forEach(p => {
      const status = this.inventory.getExpiryStatus(p.expiryDate);
      if (status === 'good') good++;
      else if (status === 'warning') warning++;
      else expired++;
    });

    const total = products.length;
    if (total === 0) return null;

    // Açı hesaplamaları (Conic gradient için)
    const goodDeg = (good / total) * 360;
    const warningDeg = (warning / total) * 360;
    const expiredDeg = (expired / total) * 360;

    // CSS Conic Gradient string oluşturma
    // Sıralama: İyi -> Riskli -> SKT Geçmiş
    const gradient = `conic-gradient(
      #10b981 0deg ${goodDeg}deg, 
      #f59e0b ${goodDeg}deg ${goodDeg + warningDeg}deg, 
      #ef4444 ${goodDeg + warningDeg}deg 360deg
    )`;

    return {
      total,
      counts: { good, warning, expired },
      gradient
    };
  });
}