// src/components/product-options-modal/product-options-modal.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Product } from '../product-card/product-card.component'; 

// Định nghĩa interface cho dữ liệu gửi đi khi thêm vào giỏ hàng
export interface CartItem {
    product: Product;
    selectedColor: string; 
    selectedSize: string;
    quantity: number;
}

@Component({
  selector: 'app-product-options-modal',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './product-options-modal.component.html', 
  styleUrls: ['./product-options-modal.component.css'] 
})
export class ProductOptionsModalComponent implements OnInit {
  
  @Input({ required: true }) product!: Product;
  @Output() closeModal = new EventEmitter<void>();
  @Output() productAdded = new EventEmitter<CartItem>(); // Sự kiện khi thêm vào giỏ hàng

  // Trạng thái lựa chọn
  selectedColor: string = ''; 
  selectedSize: string = ''; 
  selectedQuantity: number = 1;
  maxQuantity: number = 1;

  ngOnInit(): void {
    this.maxQuantity = this.product.quantity || 1;
    
    console.log("Size Options Available:", this.sizeOptions);
    this.selectedQuantity = 1;
    
    // Khởi tạo màu mặc định
    if (this.product.colors && this.product.colors.length > 0) {
      this.selectedColor = this.product.colors[0].hexCode;
    }
    
    // Khởi tạo size mặc định nếu có hàng
    if (this.sizeOptions.length > 0) {
      this.selectedSize = this.sizeOptions[0];
    }
  }

  // ============== GETTER XỬ LÝ DỮ LIỆU TỪ DB (sizeOptions) ==============

  /**
   * Chuyển đổi thuộc tính product.size từ DB thành mảng tùy chọn.
   * Nếu không có hàng (không có dữ liệu), trả về mảng rỗng.
   */
    get sizeOptions(): string[] {
    const sizeData = this.product.size;
    let sizeArray: string[] = [];
    
    // Trường hợp 1: Dữ liệu là MẢNG
    if (Array.isArray(sizeData)) {
        sizeArray = sizeData.map((s: any) => s.toString().trim());
    } 
    
    // Trường hợp 2: Dữ liệu là CHUỖI (ví dụ: "36" hoặc "36, 37")
    else if (typeof sizeData === 'string' && sizeData) {
        // Ép kiểu an toàn
        const sizeString = sizeData as string; 
        
        // Phân tách chuỗi bằng dấu phẩy. Nếu chuỗi chỉ là "36", nó sẽ tạo ra ["36"].
        sizeArray = sizeString.split(',').map(s => s.trim());
    }
    
    // Trả về mảng đã lọc (chỉ giữ lại các giá trị không rỗng)
    return sizeArray.filter(s => s.length > 0);
  }
  
  // Getter giá (để giữ cho HTML sạch sẽ)
  get originalPrice(): number { return this.product.originalPrice; }
  get salePrice(): number { return this.product.salePrice; }

  // ============== LOGIC XỬ LÝ LỰA CHỌN ==============
  
  selectColor(colorHex: string): void {
    this.selectedColor = colorHex;
  }

  selectSize(size: string): void { 
    this.selectedSize = size;
  }
  
  changeQuantity(delta: number): void {
    const newQuantity = this.selectedQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= this.maxQuantity) {
      this.selectedQuantity = newQuantity;
    }
  }

  // ============== LOGIC THÊM VÀO GIỎ HÀNG ==============
  
  addToCart(): void {
    // 1. Kiểm tra tính hợp lệ của lựa chọn
    if (this.product.colors && this.product.colors.length > 0 && !this.selectedColor) {
        alert("Vui lòng chọn màu sắc.");
        return;
    }
    if (this.sizeOptions.length > 0 && !this.selectedSize) { 
        alert("Vui lòng chọn kích thước.");
        return;
    }
    
    // 2. Tạo đối tượng CartItem
    const item: CartItem = {
      product: this.product,
      selectedColor: this.selectedColor,
      selectedSize: this.selectedSize,
      quantity: this.selectedQuantity
    };
    
    // 3. Phát sự kiện
    this.productAdded.emit(item);
    
    // 4. Đóng Modal
    this.onClose();
  }
  
  onClose() {
    this.closeModal.emit();
  }
}