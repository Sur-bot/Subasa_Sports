  // src/components/product-card/product-card.component.ts

  import { Component, Input, Output, EventEmitter } from '@angular/core';
  import { CommonModule, DecimalPipe } from '@angular/common';

  // ----------------------------------------------------
  // EXPORT INTERFACE ĐỂ CÁC FILE KHÁC CÓ THỂ IMPORT
  // ----------------------------------------------------
  export interface ProductSizeOption {
  quantity: number;
  size: string | number;
  status: string;
}
  export interface ProductColor {
    hexCode: string;
    isSelected: boolean;
  }

  export interface Product {
    id: string; // Dùng cho trackBy trong @for
    description: string;
    productName: string;
    salePrice: number;
    originalPrice: number;
    discount: number;
    brand: string;
    imageUrl: string;
    colors: ProductColor[];
    quantity?: number; // Số lượng trong kho
    sizes?: ProductSizeOption[]; // Mảng kích cỡ sản phẩm
    productrating: number; // Đánh giá sao
    status: string; // Trạng thái sản phẩm
    soldCount: number;
    hasSize: boolean; 
  }

  @Component({
    selector: 'app-product-card',
    standalone: true, // Component độc lập
    imports: [CommonModule, DecimalPipe],
    templateUrl: './product-card.component.html',
    styleUrls: ['./product-card.component.css'] 
  })
  export class ProductCardComponent {
    @Output() optionSelected = new EventEmitter<Product>(); 

    onSelectOption() {
      // Phát ra toàn bộ dữ liệu sản phẩm để component cha có thể hiển thị modal
      this.optionSelected.emit(this.product);
    }
    // Input bắt buộc để nhận dữ liệu sản phẩm
    @Input({ required: true }) product!: Product; 
  }