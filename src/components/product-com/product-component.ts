import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-product',
  standalone: true,
  templateUrl: './product-component.html',
  styleUrls: ['./product-component.css'],
  imports: [CommonModule, FormsModule]
})
export class ProductComponent {
  @Output() close = new EventEmitter<void>();

  product: any = {
    productName: '',
    description: '',
    price: null,
    size: '',
    quantity: null,
    discount: null,
    brand: '',
    status: 'pending',   // để admin duyệt
    productRating: 0,
    productImage: [],
    ownerEmail: ''       // 👈 email người đăng
  };

  selectedFiles: File[] = [];
  loading = false;

  constructor(private firestore: Firestore, private auth: Auth) {}

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

  async createProduct() {
    try {
      this.loading = true;
      const urls: string[] = [];

      for (const file of this.selectedFiles) {
        const link = await this.uploadImage(file);
        urls.push(link);
      }

      // Gán email người đăng
      const currentUser = this.auth.currentUser;
      this.product.ownerEmail = currentUser?.email || 'unknown';

      this.product.productImage = urls;

      const productRef = collection(this.firestore, 'products');
      await addDoc(productRef, this.product);

      alert('Tạo sản phẩm thành công!');
      this.resetForm();
      this.close.emit();
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo sản phẩm.');
    } finally {
      this.loading = false;
    }
  }

  resetForm() {
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
    this.selectedFiles = [];
  }
}
