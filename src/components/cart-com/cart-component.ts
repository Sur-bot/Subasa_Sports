// src/components/cart/cart.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
// ✅ Import CartService và CartItem từ service
import { CartService, CartItem } from '../servives/cart.service';

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
  imports: [CommonModule, RouterLink],
})
export class CartComponent {
  public readonly vm$: Observable<CartViewModel>;

  constructor(public cartService: CartService) {
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
}