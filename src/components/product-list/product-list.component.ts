
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { ProductFormComponent } from '../product-form/product-form.component';
import { Product, ExpiryStatus } from '../../models';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductFormComponent],
  templateUrl: './product-list.component.html'
})
export class ProductListComponent {
  inventory = inject(InventoryService);
  
  // UI State
  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  searchQuery = signal('');
  selectedCategory = signal('Tümü');
  statusFilter = signal<'all' | ExpiryStatus>('all');
  selectedIds = signal<Set<string>>(new Set());

  // Use dynamic categories from service
  categories = this.inventory.categoryNames;

  // Filtered Products
  filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const cat = this.selectedCategory();
    const stat = this.statusFilter();

    return this.inventory.products().filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(query) || p.barcode.includes(query);
      const matchesCategory = cat === 'Tümü' || p.category === cat;
      
      let matchesStatus = true;
      const pStatus = this.inventory.getExpiryStatus(p.expiryDate);
      
      if (stat !== 'all') {
        matchesStatus = pStatus === stat;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  });

  // Actions
  openAddModal() {
    this.editingProduct.set(null);
    this.showModal.set(true);
  }

  openEditModal(product: Product) {
    this.editingProduct.set(product);
    this.showModal.set(true);
  }

  deleteProduct(id: string) {
    if(confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      this.inventory.removeProduct(id);
      this.selectedIds.update(set => { set.delete(id); return new Set(set); });
    }
  }

  async applyDiscount(product: Product, percentage: number) {
    if (!confirm(`${product.name} ürününe %${percentage} indirim uygulamak istediğinize emin misiniz?`)) return;

    const newPrice = Number((product.price * (1 - percentage / 100)).toFixed(2));
    await this.inventory.updateProduct(product.id, { price: newPrice });
  }

  toggleSelection(id: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (checked) newSet.add(id);
      else newSet.delete(id);
      return newSet;
    });
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      const allIds = this.filteredProducts().map(p => p.id);
      this.selectedIds.set(new Set(allIds));
    } else {
      this.selectedIds.set(new Set());
    }
  }

  bulkDelete() {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    
    if (confirm(`${ids.length} ürünü silmek istediğinize emin misiniz?`)) {
      this.inventory.bulkRemove(ids);
      this.selectedIds.set(new Set());
    }
  }

  exportCSV() {
    const products = this.filteredProducts();
    if (products.length === 0) return;

    const headers = ['Barkod', 'Ürün Adı', 'Kategori', 'SKT', 'Stok', 'Fiyat'];
    const rows = products.map(p => [
      p.barcode,
      p.name,
      p.category,
      p.expiryDate,
      p.quantity,
      p.price
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stok_raporu_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  closeModal() {
    this.showModal.set(false);
  }

  // Helpers
  getStatusClass(dateStr: string): string {
    const status = this.inventory.getExpiryStatus(dateStr);
    switch (status) {
      case 'expired': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'good': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    }
  }

  getStatusLabel(dateStr: string): string {
    const status = this.inventory.getExpiryStatus(dateStr);
    switch (status) {
      case 'expired': return 'SKT Geçti';
      case 'warning': return 'Riskli';
      case 'good': return 'Uygun';
    }
  }

  isRisky(dateStr: string): boolean {
    return this.inventory.getExpiryStatus(dateStr) === 'warning';
  }
}
