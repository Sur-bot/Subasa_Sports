import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiProductService, ApiProduct } from '../servives/api-product.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { ProductReviewComponent } from '../product-review-com/product-review.component';

@Component({
  selector: 'app-product-details',
  standalone: true,
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css'],
  imports: [FormsModule, CommonModule, ProductReviewComponent],
})
export class ProductDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  product: ApiProduct | null = null;
  isLoading = true;
  errorMessage = '';
  quantity = 1;
  maxQuantity = 1;
  relatedProducts: ApiProduct[] = [];
  showFullDesc: boolean = false;

  // Slider
  currentIndex = 0;
  slideWidth = 0;
  maxIndex = 0;
  autoplaySub?: Subscription;

  @ViewChild('relatedSliderWrapper') sliderWrapper!: ElementRef<HTMLDivElement>;

  private _sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private apiProductService: ApiProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'Không tìm thấy sản phẩm';
      this.isLoading = false;
      return;
    }

    const idParam: string | number = /^\d+$/.test(id) ? Number(id) : id;

    this._sub = this.apiProductService.getProductById(idParam).subscribe({
      next: (product: ApiProduct | null) => {
        this.isLoading = false;
        if (!product) {
          this.errorMessage = 'Sản phẩm không tồn tại hoặc đã bị xóa';
          return;
        }

        this.product = product;
        this.maxQuantity = product.quantity || 1;
        this.quantity = 1;

        // Load related products
        this.apiProductService.getProducts().subscribe((list: ApiProduct[]) => {
          this.relatedProducts = list.filter((p) => p.id !== product.id).slice(0, 12);
          this.calculateMaxIndex();
          this.startAutoplay();
          this.cdr.markForCheck();
        });
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = 'Không thể tải dữ liệu sản phẩm';
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {
    this.updateSlideWidth();
    this.startAutoplay();
  }

  ngAfterViewChecked(): void {
    this.updateSlideWidth();
  }

  // Getter helper cho template
  get totalSlides(): number {
    return Math.ceil(this.relatedProducts.length / 6); // 6 sản phẩm trên 1 view
  }

  private calculateMaxIndex() {
    this.maxIndex = Math.max(0, Math.ceil(this.relatedProducts.length / 6) - 1);
    if (this.currentIndex > this.maxIndex) this.currentIndex = this.maxIndex;
  }

  increaseQuantity(): void {
    if (this.quantity < this.maxQuantity) this.quantity++;
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) this.quantity--;
  }

  onQuantityChange(): void {
    if (this.quantity < 1) this.quantity = 1;
    else if (this.quantity > this.maxQuantity) this.quantity = this.maxQuantity;
  }

  prevSlide(): void {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  nextSlide(): void {
    if (this.currentIndex < this.maxIndex) this.currentIndex++;
  }

  addToCart(product: ApiProduct): void {
    console.log('Add to cart', product);
  }

  // Autoplay slider
  startAutoplay() {
    if (typeof window === 'undefined') return;
    this.sliderInterval = setInterval(() => {
      if (this.currentIndex < this.maxIndex) this.currentIndex++;
      else this.currentIndex = 0;
    }, 3000); // mỗi 3 giây chuyển slide
  }
  // Auto-play slider
  private sliderInterval: any;

  ngOnDestroy(): void {
    if (this._sub) this._sub.unsubscribe();
    if (this.sliderInterval) clearInterval(this.sliderInterval);
  }

  // Cập nhật slideWidth an toàn
  private updateSlideWidth() {
    if (typeof window === 'undefined') return; // SSR check

    if (this.relatedProducts.length && this.sliderWrapper) {
      const width = this.sliderWrapper.nativeElement.offsetWidth;
      if (width && width !== this.slideWidth) {
        this.slideWidth = width;
        this.calculateMaxIndex();
        this.cdr.detectChanges();
      }
    }
  }

  // mô tả sản phẩm
  toggleDesc() {
    this.showFullDesc = !this.showFullDesc;
  }
}
