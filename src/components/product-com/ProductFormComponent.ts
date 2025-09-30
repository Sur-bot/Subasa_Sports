import { Component, EventEmitter, Input, Output, ChangeDetectorRef, NgZone, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, doc, updateDoc, deleteDoc, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-product-form',
  standalone: true,
  templateUrl: './ProductFormComponent.html',
  styleUrls: ['./ProductFormComponent.css'],
  imports: [CommonModule, FormsModule]
})
export class ProductFormComponent implements OnInit, OnChanges {
  @Output() close = new EventEmitter<void>();
  @Input() productData: any = null;
  @Input() productList: any[] = [];
  @Output() productChange = new EventEmitter<any>();

  product: any = {
    productName: '',
    description: '',
    price: null,
    sizes: [],   // 👉 thay vì size + quantity đơn lẻ, ta dùng mảng
    discount: null,
    brand: '',
    category: '',
    status: 'pending',
    productRating: 0,
    productImage: [],
    ownerEmail: ''
  };

  selectedFiles: File[] = [];
  loading = false;

  categories: any[] = [];
  brands: any[] = [];
  selectedCategory: string = '';

  // 👉 danh sách size từ 36 -> 46
  availableSizes = Array.from({ length: 11 }, (_, i) => 36 + i);

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async ngOnInit() {
    await this.loadCategories();

    if (this.productData) {
      this.product = { ...this.productData };
      this.selectedCategory = this.product.category || '';
      if (!this.product.sizes) this.product.sizes = [];
      if (this.selectedCategory) {
        await this.loadBrands();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['productData']) {
      if (this.productData) {
        this.product = { ...this.productData };
        if (!this.product.sizes) this.product.sizes = [];
        this.selectedCategory = this.product.category || '';
        if (this.selectedCategory) {
          this.loadBrands();
        }
      } else {
        this.resetForm();
      }
      this.selectedFiles = [];
    }
  }

  resetForm() {
    this.product = {
      productName: '',
      description: '',
      price: null,
      sizes: [],
      discount: null,
      brand: '',
      category: '',
      status: 'pending',
      productRating: 0,
      productImage: [],
      ownerEmail: ''
    };
    this.selectedCategory = '';
    this.brands = [];
  }

  getPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  onFileSelected(event: any) {
    if (event.target.files) {
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  async uploadImage(file: File): Promise<string> {
    const url = `https://api.cloudinary.com/v1_1/dyr0gm9zc/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'Subasa_Sports');
    const res = await fetch(url, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Upload thất bại');
    const data = await res.json();
    return data.secure_url;
  }

  async loadCategories() {
    const ref = collection(this.firestore, 'category');
    const snap = await getDocs(ref);

    this.zone.run(() => {
      this.categories = snap.docs.map(d => ({
        id: d.id,
        name: d.data()['name'] || d.id
      }));
      this.cdr.markForCheck();
    });
  }

  async loadBrands() {
    if (!this.selectedCategory) {
      this.brands = [];
      return;
    }

    const ref = collection(this.firestore, `category/${this.selectedCategory}/brand`);
    const snap = await getDocs(ref);

    this.zone.run(() => {
      this.brands = snap.docs.map(d => ({
        id: d.id,
        name: d.data()['name'] || d.id
      }));
      this.cdr.markForCheck();
    });
  }

  /** Toggle chọn/bỏ chọn size */
  toggleSize(size: number) {
    const index = this.product.sizes.findIndex((s: any) => s.size === size);
    if (index > -1) {
      this.product.sizes.splice(index, 1);
    } else {
      this.product.sizes.push({ size, quantity: 0 });
    }
  }

  isSelected(size: number): boolean {
    return this.product.sizes.some((s: any) => s.size === size);
  }

  async saveProduct() {
    try {
      this.loading = true;

      if (!this.selectedCategory) {
        alert('Vui lòng chọn danh mục');
        return;
      }

      if (!this.product.brand) {
        alert('Vui lòng chọn thương hiệu');
        return;
      }

      this.product.category = this.selectedCategory;

      // Upload ảnh mới
      if (this.selectedFiles.length > 0) {
        const urls: string[] = [];
        for (const file of this.selectedFiles) {
          const link = await this.uploadImage(file);
          urls.push(link);
        }
        this.product.productImage = urls;
      }

      const currentUser = this.auth.currentUser;
      this.product.ownerEmail = currentUser?.email || 'unknown';
      this.product.status = 'pending';

      if (this.product.id) {
        const ref = doc(this.firestore, 'products', this.product.id);
        const { id, ...dataToUpdate } = this.product;
        await updateDoc(ref, dataToUpdate);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        const productRef = collection(this.firestore, 'products');
        await addDoc(productRef, this.product);
        alert('Tạo sản phẩm thành công!');
      }

      this.close.emit();
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi lưu sản phẩm');
    } finally {
      this.loading = false;
    }
  }

  selectProduct(id: string) {
    const p = this.productList.find(x => x.id === id);
    if (p) {
      this.product = { ...p };
      if (!this.product.sizes) this.product.sizes = [];
      this.selectedCategory = this.product.category || '';
      if (this.selectedCategory) {
        this.loadBrands();
      }
      this.productChange.emit(p);
    }
  }

  async deleteProduct() {
    if (!this.product.id) return;

    const confirmDelete = confirm(`Bạn có chắc muốn xóa sản phẩm "${this.product.productName}"?`);
    if (!confirmDelete) return;

    try {
      this.loading = true;
      const ref = doc(this.firestore, 'products', this.product.id);
      await deleteDoc(ref);

      alert('Xóa sản phẩm thành công!');
      this.close.emit();
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi xóa sản phẩm');
    } finally {
      this.loading = false;
    }
  }
}
