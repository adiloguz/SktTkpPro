
import { Component, EventEmitter, Input, Output, inject, signal, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product } from '../../models';
import { InventoryService } from '../../services/inventory.service';

// Declare Quagga globally
declare var Quagga: any;

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './product-form.component.html'
})
export class ProductFormComponent implements OnDestroy {
  @Input() set product(p: Product | null) {
    if (p) {
      this.isEdit = true;
      this.editId = p.id;
      this.form.patchValue(p);
      if (p.image) {
        this.previewImage.set(p.image);
      }
    } else {
      this.isEdit = false;
      this.editId = null;
      this.previewImage.set(null);
      
      // Default to first category if available
      const firstCat = this.inventory.categories()[0]?.name || '';
      this.form.reset({
        quantity: 1,
        price: 0,
        category: firstCat
      });
    }
  }
  @Output() close = new EventEmitter<void>();

  fb = inject(FormBuilder);
  inventory = inject(InventoryService);
  
  // Use computed categories from service
  categories = this.inventory.categoryNames;
  
  isEdit = false;
  editId: string | null = null;
  
  // State
  previewImage = signal<string | null>(null);
  isScanning = signal(false);
  scanError = signal<string | null>(null);

  form = this.fb.group({
    barcode: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    category: ['', Validators.required],
    expiryDate: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0)]],
    supplier: ['']
  });

  ngOnDestroy(): void {
    this.stopScanner();
  }

  // --- Image Upload ---

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.previewImage.set(null);
  }

  // --- Barcode Scanner Logic ---

  startScanner() {
    this.isScanning.set(true);
    this.scanError.set(null);

    // Wait for the DOM element to be available
    setTimeout(() => {
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: document.querySelector('#interactive'),
          constraints: {
            facingMode: "environment", // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        decoder: {
          readers: [
            "ean_reader", // Most common retail barcode (EAN-13)
            "ean_8_reader",
            "code_128_reader",
            "upc_reader",
            "upc_e_reader"
          ]
        },
        locate: true
      }, (err: any) => {
        if (err) {
          console.error('Quagga Init Error:', err);
          this.scanError.set('Kamera başlatılamadı. Lütfen izinleri kontrol edin.');
          this.isScanning.set(false);
          return;
        }
        Quagga.start();
      });

      Quagga.onDetected(this.onBarcodeDetected.bind(this));
    }, 100);
  }

  stopScanner() {
    if (this.isScanning()) {
      Quagga.stop();
      Quagga.offDetected(this.onBarcodeDetected);
      this.isScanning.set(false);
    }
  }

  onBarcodeDetected(result: any) {
    const code = result.codeResult.code;
    if (code) {
      this.form.patchValue({ barcode: code });
      this.stopScanner();
    }
  }

  // --- Form Logic ---

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const productData: any = {
      barcode: val.barcode!,
      name: val.name!,
      category: val.category!,
      expiryDate: val.expiryDate!,
      quantity: val.quantity!,
      price: val.price!,
      supplier: val.supplier || '',
      image: this.previewImage() || undefined
    };

    if (this.isEdit && this.editId) {
      await this.inventory.updateProduct(this.editId, productData);
    } else {
      await this.inventory.addProduct(productData);
    }

    this.close.emit();
  }

  cancel() {
    this.stopScanner();
    this.close.emit();
  }
}
