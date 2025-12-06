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
import { Router } from '@angular/router';
import { ApiProductService, ApiProduct } from '../servives/api-product.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { ProductReviewComponent } from '../product-review-com/product-review.component';
import { CartService } from '../servives/cart.service';
import { NotificationModalComponent } from '../notification-modal/notification-modal.component';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';


@Component({
  selector: 'app-product-details',
  standalone: true,
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.css'],
  imports: [FormsModule, CommonModule, ProductReviewComponent, NotificationModalComponent, CheckoutModalComponent],
})


export class ProductDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  selectedSize: string | number | null = null;
  modalVisible: boolean = false;
  modalTitle: string = '';
  modalMessage: string = '';
  modalType: 'success' | 'error' = 'success';

  isCheckoutVisible: boolean = false;
  isLoginRequestVisible: boolean = false;

  product: ApiProduct | null = null;
  isLoading = true;
  errorMessage = '';
  quantity = 1;
  maxQuantity = 1;
  relatedProducts: ApiProduct[] = [];
  showFullDesc: boolean = false;


  currentIndex = 0;
  slideWidth = 0;
  maxIndex = 0;
  autoplaySub?: Subscription;

  @ViewChild('relatedSliderWrapper') sliderWrapper!: ElementRef<HTMLDivElement>;

  private _sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private apiProductService: ApiProductService,
    private cdr: ChangeDetectorRef,
    private cartService: CartService,
    private router: Router
  ) { }

  selectSize(size: string | number) {
    this.selectedSize = size;

    if (this.product && this.product.sizes) {
      const selectedOption = this.product.sizes.find(s => s.size === size);
      if (selectedOption) {
        this.maxQuantity = Number(selectedOption.quantity) || 0;

        if (this.quantity > this.maxQuantity) this.quantity = 1;
      }
    }
  }
  showModal(title: string, message: string, type: 'success' | 'error') {
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalType = type;
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
  }
  onAddToCart(): void {
    if (!this.product) return;

    const hasSize = this.product.sizes && this.product.sizes.length > 0;

    if (hasSize && !this.selectedSize) {
      this.showModal('Thông báo', 'Vui lòng chọn kích thước (Size) trước khi mua!', 'error');
      return;
    }


    let currentStock = this.product.quantity || 0;

    if (hasSize && this.selectedSize) {
      const sizeOpt = this.product.sizes?.find(s => s.size === this.selectedSize);
      currentStock = sizeOpt ? (Number(sizeOpt.quantity) || 0) : 0;
    }

    if (currentStock <= 0) {
      this.showModal('Rất tiếc', 'Sản phẩm này (hoặc size này) đã hết hàng!', 'error');
      return;
    }


    const productForCart: any = {
      id: this.product.id,
      productName: this.product.name,
      salePrice: this.product.price,
      imageUrl: this.product.image,
      originalPrice: this.product.oldPrice,


      hasSize: hasSize,
      sizes: this.product.sizes || [],
      quantity: currentStock,
      discount: 0
    };
   

    this.cartService.addToCart({
      product: productForCart,

      selectedSize: this.selectedSize ? String(this.selectedSize) : 'Mặc định',
      selectedColor: 'Mặc định',
      quantity: this.quantity
    });

    this.showModal('Thành công', `Đã thêm sản phẩm vào giỏ hàng!`, 'success');
  }

  onBuyNow(): void {
    if (!this.product) return;

    // A. VALIDATE SIZE & TỒN KHO
    const hasSize = this.product.sizes && this.product.sizes.length > 0;

    if (hasSize && !this.selectedSize) {
      this.showModal('Thông báo', 'Vui lòng chọn kích thước (Size) trước khi mua!', 'error');
      return;
    }

    let currentStock = this.product.quantity || 0;
    if (hasSize && this.selectedSize) {
      const sizeOpt = this.product.sizes?.find(s => s.size === this.selectedSize);
      currentStock = sizeOpt ? (Number(sizeOpt.quantity) || 0) : 0;
    }

    if (currentStock <= 0) {
      this.showModal('Rất tiếc', 'Sản phẩm này tạm hết hàng!', 'error');
      return;
    }

    // B. THÊM VÀO GIỎ HÀNG (Âm thầm)
    const productForCart: any = {
      id: this.product.id,
      productName: this.product.name,
      salePrice: this.product.price,
      imageUrl: this.product.image,
      originalPrice: this.product.oldPrice,
      hasSize: hasSize,
      sizes: this.product.sizes || [],
      quantity: currentStock,
      discount: 0
    };

    this.cartService.addToCart({
      product: productForCart,
      selectedSize: this.selectedSize ? String(this.selectedSize) : 'Mặc định',
      selectedColor: 'Mặc định',
      quantity: this.quantity
    });

    // C. KIỂM TRA ĐĂNG NHẬP (SỬA LẠI ĐOẠN NÀY)
    const userId = localStorage.getItem('userId'); // Kiểm tra xem có ID người dùng không
    const isGuest = localStorage.getItem('isGuest');

    // Logic mới: Bắt đăng nhập nếu là Guest (true) HOẶC chưa có userId (đã đăng xuất)
    if (isGuest === 'true' || !userId) {
      this.isLoginRequestVisible = true; // Hiện modal bắt đăng nhập
    } else {
      this.isCheckoutVisible = true; // Đã là thành viên -> Hiện Checkout
    }
  }

  goToLogin() {
    this.isLoginRequestVisible = false;
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      localStorage.setItem('productId', id);
      console.log('Saved productId to localStorage:', id);
    }

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
