import { Component, EventEmitter, Input, Output, ChangeDetectorRef, NgZone, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';

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

  private apiUrl = 'http://192.168.1.3:4000/api/products'; // 🔹 API của bạn

  product: any = {
    productName: '',
    description: '',
    price: null,
    sizes: [],
    quantity: 0,
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
  selectedCategoryObj: any = null;
  availableSizes = Array.from({ length: 11 }, (_, i) => 36 + i);

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  async ngOnInit() {
    await this.loadCategories();

    if (this.productData) {
      this.product = { ...this.productData };
      this.selectedCategory = this.product.category || '';
      this.selectedCategoryObj = this.categories.find(c => c.id === this.selectedCategory) || null;
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
        this.selectedCategoryObj = this.categories.find(c => c.id === this.selectedCategory) || null;
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
      quantity: 0,
      discount: null,
      brand: '',
      category: '',
      status: 'pending',
      productRating: 0,
      productImage: [],
      ownerEmail: ''
    };
    this.selectedCategory = '';
    this.selectedCategoryObj = null;
    this.brands = [];
  }

  getPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  onFileSelected(event: any) {
  if (event.target.files) {
    const files = Array.from(event.target.files) as File[];

    // Tạo preview sẵn để template không phải gọi hàm mỗi lần render
    this.selectedFiles = files.map(file => {
      return Object.assign(file, { preview: URL.createObjectURL(file) });
    });

    this.cdr.detectChanges();
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

  // Lấy danh mục từ Firestore
  async loadCategories() {
    const ref = collection(this.firestore, 'category');
    const snap = await getDocs(ref);

    this.zone.run(() => {
      this.categories = snap.docs.map(d => ({
        id: d.id,
        name: d.data()['name'] || d.id,
        hasSize: d.data()['hasSize'] ?? true
      }));
      this.cdr.markForCheck();
    });
  }

  // Lấy brand theo category từ Firestore
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

  onCategoryChange(categoryId: string) {
    this.selectedCategory = categoryId;
    this.selectedCategoryObj = this.categories.find(c => c.id === categoryId) || null;
    this.loadBrands();
  }

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

  // GỌI API để thêm / cập nhật
  async saveProduct() {
    try {
      this.loading = true;

      if (!this.selectedCategory) return alert('Vui lòng chọn danh mục');
      if (!this.product.brand) return alert('Vui lòng chọn thương hiệu');

      this.product.category = this.selectedCategory;

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
        // Cập nhật
        await this.http.put(`${this.apiUrl}/${this.product.id}`, this.product).toPromise();
        alert('Cập nhật sản phẩm thành công!');
      } else {
        // Thêm mới
        await this.http.post(this.apiUrl, this.product).toPromise();
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
      this.selectedCategoryObj = this.categories.find(c => c.id === this.selectedCategory) || null;
      if (this.selectedCategory) {
        this.loadBrands();
      }
      this.productChange.emit(p);
    }
  }

  // GỌI API để xóa
  async deleteProduct() {
    if (!this.product.id) return;

    const confirmDelete = confirm(`Bạn có chắc muốn xóa sản phẩm "${this.product.productName}"?`);
    if (!confirmDelete) return;

    try {
      this.loading = true;
      await this.http.delete(`${this.apiUrl}/${this.product.id}`).toPromise();
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
