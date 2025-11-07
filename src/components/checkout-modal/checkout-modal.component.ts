// src/components/checkout-modal/checkout-modal.component.ts

import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../servives/cart.service'; // Import service
import { Subscription } from 'rxjs';
import { ProductSizeOption } from '../product-card/product-card.component';

// Tạo một interface nội bộ để quản lý trạng thái "selected"
interface CheckoutItem extends CartItem {
  isSelected: boolean;
}

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule], // Đảm bảo đã import FormsModule
  templateUrl: './checkout-modal.component.html',
  styleUrls: ['./checkout-modal.component.css']
})
export class CheckoutModalComponent implements OnInit, OnDestroy {
  // ❌ Bỏ @Input() items và @Input() totalPrice
  @Output() closeModal = new EventEmitter<void>();

  public displayItems: CheckoutItem[] = []; // Mảng để hiển thị (bao gồm cả trạng thái checkbox)
  public totalSelectedPrice: number = 0;   // Chỉ tính tổng tiền các mục được chọn
  
  selectedPaymentMethod: string = 'cod';
  private cartSubscription!: Subscription; // Để lắng nghe thay đổi từ service

  // ✅ 1. Inject CartService
  constructor(public cartService: CartService) {}

  ngOnInit(): void {
    //  2. Lắng nghe sự thay đổi của giỏ hàng
    this.cartSubscription = this.cartService.items$.subscribe(items => {
      // Tạo danh sách hiển thị mới, mặc định TẤT CẢ đều được chọn
      this.displayItems = items.map(item => ({
        ...item,
        isSelected: true // Mặc định là được chọn
      }));
      this.updateSelectedTotal(); // Cập nhật tổng tiền ngay lập Hte
    });
  }

  ngOnDestroy(): void {
    // Hủy subscription khi component bị phá hủy
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  // ✅ 3. Hàm tính toán lại tổng tiền dựa trên các checkbox
  updateSelectedTotal(): void {
    this.totalSelectedPrice = this.displayItems
      .filter(item => item.isSelected) // Lọc ra những item được chọn
      .reduce((sum, item) => sum + (item.product.salePrice * item.quantity), 0);
  }

  onClose(): void {
    this.closeModal.emit();
  }

  handleCheckout(): void {
    const itemsToPurchase = this.displayItems.filter(item => item.isSelected);
    
    if (itemsToPurchase.length === 0) {
      alert('Bạn chưa chọn sản phẩm nào để thanh toán.');
      return;
    }
    
    console.log('Đang tiến hành thanh toán cho các sản phẩm:', itemsToPurchase);
    console.log('Tổng tiền:', this.totalSelectedPrice);
    alert('Chức năng thanh toán đang được phát triển!');
    this.onClose();
  }
  public getMaxStock(item: CartItem): number {
    if (item.product.hasSize && item.product.sizes) {
      const sizeOption = item.product.sizes.find(s => String(s.size) === item.selectedSize);
      return sizeOption ? sizeOption.quantity : 0;
    } else {
      return item.product.quantity || 0;
    }
  }

}