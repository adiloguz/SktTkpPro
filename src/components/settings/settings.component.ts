
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html'
})
export class SettingsComponent {
  inventory = inject(InventoryService);
  
  // Settings Form State
  thresholdDays = signal(this.inventory.settings().warningThresholdDays);
  
  // Category Form State
  newCategoryName = signal('');
  
  // Backup State
  isRestoring = signal(false);

  saveSettings() {
    this.inventory.updateSettings({
      warningThresholdDays: this.thresholdDays()
    });
    alert('Ayarlar başarıyla kaydedildi.');
  }

  // --- Category Actions ---

  addCategory() {
    const name = this.newCategoryName().trim();
    if (!name) return;
    
    this.inventory.addCategory(name);
    this.newCategoryName.set('');
  }

  removeCategory(id: string) {
    if (confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) {
      this.inventory.removeCategory(id);
    }
  }

  // --- Backup Actions ---

  async downloadBackup() {
    try {
      const data = await this.inventory.createBackup();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MarketSKT_Yedek_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Yedek oluşturulurken bir hata oluştu.');
      console.error(err);
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (!confirm('DİKKAT: Bu işlem mevcut tüm verilerinizi silecek ve yedekteki verileri yükleyecektir. Devam etmek istiyor musunuz?')) {
      (event.target as HTMLInputElement).value = ''; // Reset input
      return;
    }

    this.isRestoring.set(true);
    try {
      await this.inventory.restoreBackup(file);
      alert('Yedek başarıyla yüklendi.');
    } catch (err) {
      alert('Yedek yüklenirken hata oluştu. Dosya bozuk olabilir.');
      console.error(err);
    } finally {
      this.isRestoring.set(false);
      (event.target as HTMLInputElement).value = ''; // Reset input
    }
  }

  // --- Helpers ---

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('tr-TR');
  }

  getActionColor(action: string): string {
    switch(action) {
      case 'add': return 'bg-emerald-100 text-emerald-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'update': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getActionLabel(action: string): string {
    switch(action) {
      case 'add': return 'Ekleme';
      case 'delete': return 'Silme';
      case 'update': return 'Güncelleme';
      case 'system': return 'Sistem';
      default: return action;
    }
  }
}
