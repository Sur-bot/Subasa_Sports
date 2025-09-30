import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, doc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-product-form',
  standalone: true,
  templateUrl: './ProductFormComponent.html',
  styleUrls: ['./ProductFormComponent.css'],
  imports: [CommonModule, FormsModule]
})
export class ProductFormComponent {
  @Output() close = new EventEmitter<void>();
  @Input() productData: any = null; // null = create, có data = edit
  @Input() productList: any[] = [];   // <-- thêm dòng này
  @Output() productChange = new EventEmitter<any>();
  product: any = {
    productName: '',
    description: '',
    price: null,
    size: '',
    quantity: null,
    discount: null,
    brand: '',
    status: 'pending',
    productRating: 0,
    productImage: [],
    ownerEmail: ''
  };

  selectedFiles: File[] = [];
  loading = false;

  constructor(private firestore: Firestore, private auth: Auth) { }

  ngOnInit() {
    if (this.productData) {
      this.product = { ...this.productData }; // clone để edit
    }
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

  async saveProduct() {
    try {
      this.loading = true;

      // Upload ảnh mới nếu có
      if (this.selectedFiles.length > 0) {
        const urls: string[] = [];
        for (const file of this.selectedFiles) {
          const link = await this.uploadImage(file);
          urls.push(link);
        }
        this.product.productImage = urls; // thay toàn bộ ảnh cũ
      }

      const currentUser = this.auth.currentUser;
      this.product.ownerEmail = currentUser?.email || 'unknown';
      this.product.status = 'pending';

      if (this.product.id) {
        // update
        const ref = doc(this.firestore, 'products', this.product.id);
        const { id, ...dataToUpdate } = this.product;
        await updateDoc(ref, dataToUpdate);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        // create
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
  ngOnChanges() {
    if (this.productData) {
      this.product = { ...this.productData };
    } else {
      this.product = {
        productName: '',
        description: '',
        price: null,
        size: '',
        quantity: null,
        discount: null,
        brand: '',
        status: 'pending',
        productRating: 0,
        productImage: [],
        ownerEmail: ''
      };
    }
    this.selectedFiles = []; // reset ảnh upload khi đổi mode
  }
  selectProduct(id: string) {
    const p = this.productList.find(x => x.id === id);
    if (p) {
      this.product = { ...p };
      this.productChange.emit(p);
    }
  }


}
