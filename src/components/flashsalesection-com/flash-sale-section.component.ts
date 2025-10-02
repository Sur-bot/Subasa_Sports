// src/components/flashsalesection-com/flash-sale-section.component.ts

import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy, Output, EventEmitter, Input} from '@angular/core';
import { Observable } from 'rxjs'; // Không còn interval/Subscription
import { CommonModule } from '@angular/common';
import { ProductCardComponent, Product } from '../product-card/product-card.component';
import { ProductService } from '../servives/product.service'; // Đảm bảo đường dẫn này đúng

@Component({
  selector: 'app-flash-sale-section',
  standalone: true,
  imports: [
    CommonModule,
    ProductCardComponent
  ],
  templateUrl: './flash-sale-section.component.html',
  styleUrls: ['./flash-sale-section.component.css'],
  // CUNG CẤP SERVICE (Instance mới mỗi lần Component này được tạo)
  providers: [ProductService]
})
export class FlashSaleSectionComponent implements OnInit, AfterViewInit, OnDestroy {

  @Output() onOptionSelect = new EventEmitter<Product>();
   onProductCardOptionSelected(product: Product) {
        this.onOptionSelect.emit(product);
    }
  @ViewChild('productsContainer') productsContainer!: ElementRef;

  flashSaleProducts$!: Observable<Product[]>;

  // Logic Cuộn
  isStart: boolean = true;
  isEnd: boolean = false;
  scrollStep = 255;

  constructor(private productService: ProductService) { }

  ngOnInit(): void {
    // Gọi Service để lấy dữ liệu SẢN PHẨM GIẢM GIÁ từ Firebase
    this.flashSaleProducts$ = this.productService.getFlashSaleProducts();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScrollStatus(), 500);
  }

  ngOnDestroy(): void {
    // Không cần cleanup logic đếm ngược nữa
  }

  // Logic cuộn (Giữ nguyên)
  scrollLeft(): void {
    const container = this.productsContainer.nativeElement as HTMLElement;
    container.scrollBy({ left: -this.scrollStep, behavior: 'smooth' });
    setTimeout(() => this.checkScrollStatus(), 300);
  }

  scrollRight(): void {
    const container = this.productsContainer.nativeElement as HTMLElement;
    container.scrollBy({ left: this.scrollStep, behavior: 'smooth' });
    setTimeout(() => this.checkScrollStatus(), 300);
  }

  checkScrollStatus(): void {
    if (!this.productsContainer || !this.productsContainer.nativeElement) return;
    const container = this.productsContainer.nativeElement as HTMLElement;
    const maxScroll = container.scrollWidth - container.clientWidth;

    this.isStart = container.scrollLeft < 10;
    this.isEnd = container.scrollLeft >= maxScroll - 10;
  }
}