// src/components/product-options-modal/product-options-modal.component.ts

import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// Import Product từ vị trí cũ
import { Product, ProductSizeOption } from '../product-card/product-card.component';
// ✅ Import CartService và CartItem từ service
import { CartService, CartItem } from '../servives/cart.service';

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

  selectedColor: string = '';
  selectedSize: string = '';
  selectedQuantity: number = 1;
  maxQuantity: number = 0;
  errorMessage: string | null = null;
  String = String;

  constructor(private cartService: CartService) { }

  ngOnInit(): void {
    if (this.product.colors && this.product.colors.length > 0) {
      this.selectColor(this.product.colors[0].hexCode);
    }
    if (this.product.hasSize) {
      const firstAvailableSize = this.availableSizeOptions[0];
      if (firstAvailableSize) {
        this.selectSize(firstAvailableSize.size);
      }
    }
    this.updateAvailableQuantity();
  }

  get availableSizeOptions(): ProductSizeOption[] {
    return Array.isArray(this.product.sizes)
      ? this.product.sizes.filter(opt => (opt.quantity || 0) > 0)
      : [];
  }

  selectColor(colorHex: string): void {
    this.selectedColor = colorHex;
    this.errorMessage = null;
    this.updateAvailableQuantity();
  }

  selectSize(size: string | number): void {
    this.selectedSize = String(size);
    this.errorMessage = null;
    this.updateAvailableQuantity();
  }

  private updateAvailableQuantity(): void {
    let stockQuantity = 0;
    if (this.product.hasSize && this.product.sizes) {
      if (!this.selectedSize) {
        this.maxQuantity = 0; this.selectedQuantity = 0; return;
      }
      const selectedOption = this.product.sizes.find(opt => String(opt.size) === this.selectedSize);
      stockQuantity = selectedOption ? selectedOption.quantity : 0;
    } else {
      stockQuantity = this.product.quantity || 0;
    }

    const uniqueId = `${this.product.id}-${this.selectedColor}-${this.selectedSize}`;
    const itemInCart = this.cartService.getItems().find(item => item.uniqueId === uniqueId);
    const quantityInCart = itemInCart ? itemInCart.quantity : 0;

    this.maxQuantity = stockQuantity - quantityInCart;
    this.selectedQuantity = this.maxQuantity > 0 ? 1 : 0;
  }

  changeQuantity(delta: number): void {
    const newQuantity = this.selectedQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= this.maxQuantity) {
      this.selectedQuantity = newQuantity;
    }
  }

  addToCart(): void {
    this.errorMessage = null;
    if (this.product.colors && this.product.colors.length > 0 && !this.selectedColor) {
      this.errorMessage = "Vui lòng chọn màu sắc."; return;
    }
    if (this.product.hasSize && !this.selectedSize) {
      this.errorMessage = "Vui lòng chọn kích thước."; return;
    }
    if (this.selectedQuantity <= 0) {
      this.errorMessage = "Sản phẩm đã hết hàng hoặc số lượng trong giỏ đã tối đa."; return;
    }

    const item = {
      product: this.product,
      selectedColor: this.selectedColor,
      selectedSize: this.selectedSize,
      quantity: this.selectedQuantity
    };
    
    this.cartService.addToCart(item);
    this.onClose();
  }

  onClose(): void {
    this.closeModal.emit();
  }
}