  // src/components/product-card/product-card.component.ts

  import { Component, Input } from '@angular/core';
  import { CommonModule, DecimalPipe } from '@angular/common';

  // ----------------------------------------------------
  // EXPORT INTERFACE ĐỂ CÁC FILE KHÁC CÓ THỂ IMPORT
  // ----------------------------------------------------
  export interface ProductColor {
    hexCode: string;
    isSelected: boolean;
  }

  export interface Product {
    id: string; // Dùng cho trackBy trong @for
    description: string;
    productName: string;
    discount: number;
    salePrice: number;
    originalPrice: number;
    discountPercent: number;
    brand: string;
    // hasCoupon: boolean;
    //  isFreeShip: boolean;
    imageUrl: string;
    colors: ProductColor[];
    quantity: number; // Số lượng trong kho
    productrating: number; // Đánh giá sao
    status: string; // Trạng thái sản phẩm
    soldCount: number;
  }

  @Component({
    selector: 'app-product-card',
    standalone: true, // Component độc lập
    imports: [CommonModule, DecimalPipe],
    templateUrl: './product-card.component.html',
    styleUrls: ['./product-card.component.css'] // <-- Dùng CSS
  })
  export class ProductCardComponent {
    
    // Input bắt buộc để nhận dữ liệu sản phẩm
    @Input({ required: true }) product!: Product; 
  }