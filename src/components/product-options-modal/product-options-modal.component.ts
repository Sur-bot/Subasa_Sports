import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, ProductSizeOption } from '../product-card/product-card.component';
import { CartService } from '../servives/cart.service'; // Kiểm tra lại đường dẫn service này của bạn

@Component({
  selector: 'app-product-options-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-options-modal.component.html',
  styleUrls: ['./product-options-modal.component.css']
})
export class ProductOptionsModalComponent implements OnInit {
  @Input({ required: true }) product!: Product;
  @Output() closeModal = new EventEmitter<void>();

  selectedColor: string = '';
  selectedSize: string = '';
  selectedQuantity: number = 1;
  maxQuantity: number = 0;
  errorMessage: string | null = null;
  String = String;

  // Biến quản lý việc ấn giữ
  private timer: any;

  constructor(
    private cartService: CartService,
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (this.product.colors && this.product.colors.length > 0) {
      this.selectColor(this.product.colors[0].hexCode);
    }
    if (this.product.hasSize && this.availableSizeOptions.length > 0) {
      this.selectSize(this.availableSizeOptions[0].size);
    }
    this.updateAvailableQuantity();
  }

  get availableSizeOptions(): ProductSizeOption[] {
    return Array.isArray(this.product.sizes)
      ? this.product.sizes.filter(opt => (opt.quantity || 0) > 0)
      : [];
  }

  selectColor(colorHex: string): void {
    this.selectedColor = colorHex;
    this.errorMessage = null;
    this.updateAvailableQuantity();
  }

  selectSize(size: string | number): void {
    this.selectedSize = String(size);
    this.errorMessage = null;
    this.updateAvailableQuantity();
  }

  private updateAvailableQuantity(): void {
    let stockQuantity = 0;
    if (this.product.hasSize && this.product.sizes) {
      if (!this.selectedSize) {
        this.maxQuantity = 0; this.selectedQuantity = 0; return;
      }
      const selectedOption = this.product.sizes.find(opt => String(opt.size) === this.selectedSize);
      stockQuantity = selectedOption ? selectedOption.quantity : 0;
    } else {
      stockQuantity = this.product.quantity || 0;
    }

    const uniqueId = `${this.product.id}-${this.selectedColor}-${this.selectedSize}`;
    const itemInCart = this.cartService.getItems().find(item => item.uniqueId === uniqueId);
    const quantityInCart = itemInCart ? itemInCart.quantity : 0;

    this.maxQuantity = stockQuantity - quantityInCart;
    // Reset về 1 nếu còn hàng, về 0 nếu hết hàng
    this.selectedQuantity = this.maxQuantity > 0 ? 1 : 0;
  }

  // --- LOGIC TĂNG GIẢM SỐ LƯỢNG (ĐÃ SỬA) ---

  // Hàm thay đổi giá trị (chạy 1 lần)
  changeQuantity(delta: number): void {
    const newQuantity = this.selectedQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= this.maxQuantity) {
      this.selectedQuantity = newQuantity;
      this.cdr.detectChanges(); // Ép giao diện cập nhật ngay lập tức
    }
  }

  // Bắt đầu ấn giữ
  startChanging(delta: number): void {
    // Nếu nút bị disable hoặc hết hàng thì không làm gì
    if (this.maxQuantity === 0) return;
    if (delta < 0 && this.selectedQuantity <= 1) return;
    if (delta > 0 && this.selectedQuantity >= this.maxQuantity) return;

    // 1. Thay đổi ngay lập tức 1 lần (click đơn)
    this.changeQuantity(delta);

    // 2. Đợi 400ms, nếu vẫn giữ chuột thì bắt đầu chạy nhanh
    this.timer = setTimeout(() => {
      this.timer = setInterval(() => {
        // Kiểm tra điều kiện dừng trong vòng lặp
        if ((delta < 0 && this.selectedQuantity <= 1) || 
            (delta > 0 && this.selectedQuantity >= this.maxQuantity)) {
          this.stopChanging();
          return;
        }
        this.changeQuantity(delta);
      }, 100); // Tốc độ 100ms/lần
    }, 400);
  }

  // Thả chuột ra -> Dừng lại
  stopChanging(): void {
    if (this.timer) {
      clearInterval(this.timer);
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  // ----------------------------------------

  onManualQuantityChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let inputValue = parseInt(inputElement.value, 10);

    if (isNaN(inputValue) || inputValue < 1) {
      inputValue = 1;
    }

    if (this.maxQuantity > 0 && inputValue > this.maxQuantity) {
      inputValue = this.maxQuantity;
    } else if (this.maxQuantity === 0) {
      inputValue = 0;
    }

    this.selectedQuantity = inputValue;
    inputElement.value = inputValue.toString();
  }

  addToCart(): void {
    this.errorMessage = null;
    if (this.product.colors && this.product.colors.length > 0 && !this.selectedColor) {
      this.errorMessage = "Vui lòng chọn màu sắc."; return;
    }
    if (this.product.hasSize && !this.selectedSize) {
      this.errorMessage = "Vui lòng chọn kích thước."; return;
    }
    if (this.selectedQuantity <= 0) {
      this.errorMessage = "Sản phẩm đã hết hàng hoặc số lượng trong giỏ đã tối đa."; return;
    }

    const item = {
      product: this.product,
      selectedColor: this.selectedColor,
      selectedSize: this.selectedSize,
      quantity: this.selectedQuantity
    };
    
    this.cartService.addToCart(item);
    this.onClose();
  }

  onClose(): void {
    this.closeModal.emit();
  }
}