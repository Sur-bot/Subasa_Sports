import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../product-card/product-card.component';


export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  uniqueId: string;
  ownerEmail: string; 
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  public items$: Observable<CartItem[]> = this.itemsSubject.asObservable();

  constructor() {
   
    this.loadUserCart();
  }

 

  
  private getCartKey(): string {
    
    if (typeof localStorage === 'undefined') return 'cart_guest';

    const userId = localStorage.getItem('userId');
    return userId ? `cart_${userId}` : 'cart_guest';
  }

 
  public loadUserCart(): void {
    const key = this.getCartKey();
    let items: CartItem[] = [];
    
    if (typeof localStorage !== 'undefined') {
      const cartJson = localStorage.getItem(key);
      try {
        items = cartJson ? JSON.parse(cartJson) : [];
      } catch {
        items = [];
      }
    }
    
   
    this.itemsSubject.next(items);
  }

 

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
      console.warn('Đã đạt số lượng tối đa trong kho.');
      return;
    }

    const quantityToAdd = Math.min(itemToAdd.quantity, canBeAdded);

    if (existingItem) {
      existingItem.quantity += quantityToAdd;
    } else {
      const newItem: CartItem = { 
        ...itemToAdd, 
        quantity: quantityToAdd, 
        uniqueId: uniqueId,
        ownerEmail: itemToAdd.product.ownerEmail || '' // Lưu email chủ shop
      };
      currentItems.push(newItem);
    }

    this.itemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  updateQuantity(uniqueId: string, newQuantity: number): void {
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

    if (newQuantity <= 0) {
      item.quantity = 1;
    } else if (newQuantity > maxStock) {
      item.quantity = maxStock;
    } else {
      item.quantity = newQuantity;
    }

    this.itemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  increaseQuantity(uniqueId: string): void {
    const currentItems = [...this.itemsSubject.getValue()];
    const item = currentItems.find(i => i.uniqueId === uniqueId);
    if (!item) return;
    
    this.updateQuantity(uniqueId, item.quantity + 1);
  }

  decreaseQuantity(uniqueId: string): void {
    const currentItems = [...this.itemsSubject.getValue()];
    const item = currentItems.find(i => i.uniqueId === uniqueId);
    if (item && item.quantity > 1) {
      this.updateQuantity(uniqueId, item.quantity - 1);
    } else {
      this.removeFromCart(uniqueId);
    }
  }

  removeFromCart(uniqueId: string): void {
    const currentItems = this.itemsSubject.getValue().filter(i => i.uniqueId !== uniqueId);
    this.itemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  
  clearCart(): void {
    this.itemsSubject.next([]);
    if (typeof localStorage !== 'undefined') {
      const key = this.getCartKey();
      localStorage.removeItem(key);
    }
  }


  public getItems(): CartItem[] {
    return this.itemsSubject.getValue();
  }
  
  get totalItems$(): Observable<number> {
    return this.items$.pipe(map(items => items.reduce((total, item) => total + item.quantity, 0)));
  }

  get totalPrice$(): Observable<number> {
    return this.items$.pipe(map(items => items.reduce((total, item) => 
      total + (item.product.salePrice * item.quantity), 0)));
  }

  
  private saveCartToLocalStorage(items: CartItem[]): void {
    if (typeof localStorage !== 'undefined') {
      const key = this.getCartKey();
      localStorage.setItem(key, JSON.stringify(items));
    }
  }
}