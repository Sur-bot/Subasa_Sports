// src/components/product-options-modal/product-options-modal.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, } from '@angular/common';
import { Product, ProductSizeOption } from '../product-card/product-card.component';

export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

@Component({
  selector: 'app-product-options-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-options-modal.component.html',
  styleUrls: ['./product-options-modal.component.css']
})
export class ProductOptionsModalComponent implements OnInit {
  @Input({ required: true }) product!: Product;
  @Output() closeModal = new EventEmitter<void>();
  @Output() productAdded = new EventEmitter<CartItem>();

  selectedColor: string = '';
  selectedSize: string = '';
  selectedQuantity: number = 1;
  maxQuantity: number = 0; // Số lượng tối đa có thể mua
  errorMessage: string | null = null;

  String = String; // Để dùng trong template

  ngOnInit(): void {
    // Luôn chọn màu đầu tiên nếu có
    if (this.product.colors && this.product.colors.length > 0) {
      this.selectColor(this.product.colors[0].hexCode);
    }

    // ===================================================================
    // THAY ĐỔI 1: Phân luồng logic dựa trên `hasSize`
    // ===================================================================
    if (this.product.hasSize) {
      // Logic cũ cho sản phẩm CÓ size
      if (this.availableSizeOptions.length > 0) {
        // Tự động chọn size đầu tiên còn hàng
        this.selectSize(this.availableSizeOptions[0].size); 
      } else {
        // Hết tất cả các size
        this.maxQuantity = 0;
        this.selectedQuantity = 0;
      }
    } else {
      // Logic mới cho sản phẩm KHÔNG CÓ size (phụ kiện, v.v.)
      this.maxQuantity = this.product.quantity || 0;
      // Nếu còn hàng thì mặc định chọn 1, nếu hết hàng thì là 0
      this.selectedQuantity = this.maxQuantity > 0 ? 1 : 0;
    }
  }

  /**
   * Getter để lọc và trả về các size còn hàng.
   * Hoạt động đúng cho cả hai trường hợp.
   */
  get availableSizeOptions(): ProductSizeOption[] {
    return Array.isArray(this.product.sizes)
      ? this.product.sizes.filter(opt => (opt.quantity || 0) > 0)
      : [];
  }

  // Chọn màu
  selectColor(colorHex: string): void {
    this.selectedColor = colorHex;
    this.errorMessage = null;
  }

  // Chọn size (chỉ được gọi khi sản phẩm có size)
  selectSize(size: string | number): void {
    this.errorMessage = null;
    this.selectedSize = String(size);
    const selectedOption = this.availableSizeOptions.find(opt => String(opt.size) === this.selectedSize);

    if (selectedOption) {
      this.maxQuantity = selectedOption.quantity;
      // Reset số lượng về 1 mỗi khi đổi size
      this.selectedQuantity = this.maxQuantity > 0 ? 1 : 0;
    }
  }

  // Thay đổi số lượng
  changeQuantity(delta: number): void {
    this.errorMessage = null;
    const newQuantity = this.selectedQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= this.maxQuantity) {
      this.selectedQuantity = newQuantity;
    }
  }

  // Thêm vào giỏ hàng
  addToCart(): void {
    this.errorMessage = null;
    // Kiểm tra màu sắc
    if (this.product.colors && this.product.colors.length > 0 && !this.selectedColor) {
      this.errorMessage = "Vui lòng chọn màu sắc.";
      return;
    }

    // ===================================================================
    // THAY ĐỔI 2: Kiểm tra size một cách tường minh hơn
    // ===================================================================
    if (this.product.hasSize && !this.selectedSize) {
      this.errorMessage = "Vui lòng chọn kích thước.";
      return;
    }

    // Kiểm tra số lượng
    if (this.maxQuantity === 0) {
        this.errorMessage = "Sản phẩm đã hết hàng.";
        return;
    }
    if (this.selectedQuantity < 1) {
        this.errorMessage = "Vui lòng chọn số lượng.";
        return;
    }

    const item: CartItem = {
      product: this.product,
      selectedColor: this.selectedColor,
      selectedSize: this.selectedSize, // Sẽ là '' nếu không có size
      quantity: this.selectedQuantity
    };
    this.productAdded.emit(item);
    this.onClose();
  }

  onClose(): void {
    this.closeModal.emit();
  }
}