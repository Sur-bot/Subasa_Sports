// src/services/cart.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
// Import Product từ vị trí cũ
import { Product } from '../product-card/product-card.component';


// ✅ Định nghĩa và export CartItem tại đây
export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  uniqueId: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>(this.getCartFromLocalStorage());
  public items$: Observable<CartItem[]> = this.itemsSubject.asObservable();

  constructor() {}

  addToCart(itemToAdd: { product: Product, selectedColor: string, selectedSize: string, quantity: number }): void {
    const currentItems = [...this.itemsSubject.getValue()];
    const uniqueId = `${itemToAdd.product.id}-${itemToAdd.selectedColor}-${itemToAdd.selectedSize}`;
    const existingItem = currentItems.find(item => item.uniqueId === uniqueId);
    const quantityAlreadyInCart = existingItem ? existingItem.quantity : 0;

    let maxStock = 0;
    if (itemToAdd.product.hasSize && itemToAdd.product.sizes) {
      const sizeOption = itemToAdd.product.sizes.find(s => String(s.size) === itemToAdd.selectedSize);
      maxStock = sizeOption ? sizeOption.quantity : 0;
    } else {
      maxStock = itemToAdd.product.quantity || 0;
    }

    const canBeAdded = maxStock - quantityAlreadyInCart;
    if (canBeAdded <= 0) {
      console.warn('Đã đạt số lượng tối đa, không thể thêm sản phẩm.');
      return;
    }

    const quantityToAdd = Math.min(itemToAdd.quantity, canBeAdded);

    if (existingItem) {
      existingItem.quantity += quantityToAdd;
    } else {
      const newItem: CartItem = { ...itemToAdd, quantity: quantityToAdd, uniqueId: uniqueId };
      currentItems.push(newItem);
    }
    this.itemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  increaseQuantity(uniqueId: string): void {
    const currentItems = [...this.itemsSubject.getValue()];
    const item = currentItems.find(i => i.uniqueId === uniqueId);
    if (!item) return;

    let maxStock = 0;
    if (item.product.hasSize && item.product.sizes) {
      const sizeOption = item.product.sizes.find(s => String(s.size) === item.selectedSize);
      maxStock = sizeOption ? sizeOption.quantity : 0;
    } else {
      maxStock = item.product.quantity || 0;
    }

    if (item.quantity < maxStock) {
      item.quantity += 1;
      this.itemsSubject.next(currentItems);
      this.saveCartToLocalStorage(currentItems);
    } else {
      console.warn('Đã đạt số lượng tối đa, không thể tăng thêm.');
    }
  }

  decreaseQuantity(uniqueId: string): void {
    let currentItems = [...this.itemsSubject.getValue()];
    const item = currentItems.find(i => i.uniqueId === uniqueId);
    if (item && item.quantity > 1) {
      item.quantity -= 1;
    } else {
      currentItems = currentItems.filter(i => i.uniqueId !== uniqueId);
    }
    this.itemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  removeFromCart(uniqueId: string): void {
    const currentItems = this.itemsSubject.getValue().filter(i => i.uniqueId !== uniqueId);
    this.itemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  updateQuantity(uniqueId: string, newQuantity: number): void {
    const currentItems = [...this.itemsSubject.getValue()];
    const item = currentItems.find(i => i.uniqueId === uniqueId);

    if (!item) return;

    // 1. Tính toán tồn kho tối đa cho item này
    let maxStock = 0;
    if (item.product.hasSize && item.product.sizes) {
      const sizeOption = item.product.sizes.find(s => String(s.size) === item.selectedSize);
      maxStock = sizeOption ? sizeOption.quantity : 0;
    } else {
      maxStock = item.product.quantity || 0;
    }

    // 2. Validate số lượng nhập vào
    if (newQuantity <= 0) {
      // Nếu nhập <= 0, có thể chọn xóa hoặc reset về 1. Ở đây mình reset về 1 cho an toàn.
      item.quantity = 1;
    } else if (newQuantity > maxStock) {
      // Nếu nhập quá tồn kho -> set bằng maxStock
      item.quantity = maxStock;
      console.warn(`Số lượng yêu cầu vượt quá tồn kho. Đã điều chỉnh về ${maxStock}.`);
    } else {
      // Hợp lệ
      item.quantity = newQuantity;
    }

    // 3. Lưu lại
    this.itemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  public getItems(): CartItem[] {
    return this.itemsSubject.getValue();
  }
  
  get totalItems$(): Observable<number> {
    return this.items$.pipe(map(items => items.reduce((total, item) => total + item.quantity, 0)));
  }

  get totalPrice$(): Observable<number> {
    return this.items$.pipe(map(items => items.reduce((total, item) => total + (item.product.salePrice * item.quantity), 0)));
  }

  private getCartFromLocalStorage(): CartItem[] {
    try {
      const cartJson = localStorage.getItem('my_cart');
      return cartJson ? JSON.parse(cartJson) : [];
    } catch (e) { return []; }
  }

  private saveCartToLocalStorage(items: CartItem[]): void {
    localStorage.setItem('my_cart', JSON.stringify(items));
  }
}