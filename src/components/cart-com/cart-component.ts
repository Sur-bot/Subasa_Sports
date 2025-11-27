import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { CartService, CartItem } from '../servives/cart.service';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';

interface CartViewModel {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart-component.html',
  styleUrls: ['./cart-component.css'],
  imports: [CommonModule, RouterLink, CheckoutModalComponent],
})
export class CartComponent {
  public readonly vm$: Observable<CartViewModel>;
  public isCheckoutModalVisible = false;
  
  // Biến dùng cho chức năng ấn giữ
  private timer: any;

  constructor(
    public cartService: CartService,
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef để vẽ lại giao diện
  ) {
    this.vm$ = combineLatest([
      this.cartService.items$,
      this.cartService.totalItems$,
      this.cartService.totalPrice$
    ]).pipe(
      map(([items, totalItems, totalPrice]) => ({ items, totalItems, totalPrice }))
    );
  }

  public getMaxStock(item: CartItem): number {
    if (item.product.hasSize && item.product.sizes) {
      const sizeOption = item.product.sizes.find(s => String(s.size) === item.selectedSize);
      return sizeOption ? sizeOption.quantity : 0;
    } else {
      return item.product.quantity || 0;
    }
  }

  // --- LOGIC NHẬP SỐ TRỰC TIẾP ---
  onManualQuantityChange(event: Event, item: CartItem): void {
    const inputElement = event.target as HTMLInputElement;
    let newValue = parseInt(inputElement.value, 10);
    const maxStock = this.getMaxStock(item);

    // Validate
    if (isNaN(newValue) || newValue < 1) {
      newValue = 1;
    }
    if (newValue > maxStock) {
      newValue = maxStock;
    }

    this.cartService.updateQuantity(item.uniqueId, newValue);
    
    
    inputElement.value = newValue.toString();
  }

  // --- LOGIC ẤN GIỮ (LONG PRESS) ---
  
  // Bắt đầu ấn giữ
  startChangingQuantity(item: CartItem, delta: number) {
    const maxStock = this.getMaxStock(item);

    // Kiểm tra điều kiện giới hạn
    if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= maxStock)) return;

    // 1. Thay đổi ngay 1 lần (Click đơn)
    this.changeOne(item, delta);

    // 2. Đợi 400ms, nếu vẫn giữ chuột thì chạy liên tục
    this.timer = setTimeout(() => {
      this.timer = setInterval(() => {
        // Kiểm tra lại trong vòng lặp
        if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= maxStock)) {
          this.stopChangingQuantity();
          return;
        }
        this.changeOne(item, delta);
      }, 100); // Tốc độ 100ms
    }, 400);
  }

  // Thả tay ra -> Dừng lại
  stopChangingQuantity() {
    if (this.timer) {
      clearTimeout(this.timer);
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Hàm phụ trợ để gọi service và vẽ lại màn hình
  private changeOne(item: CartItem, delta: number) {
    if (delta > 0) {
        this.cartService.increaseQuantity(item.uniqueId);
    } else {
        this.cartService.decreaseQuantity(item.uniqueId);
    }
    this.cdr.detectChanges(); 
  }
}