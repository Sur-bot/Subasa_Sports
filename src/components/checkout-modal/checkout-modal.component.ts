import { Component, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../servives/cart.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

interface CheckoutItem extends CartItem {
  isSelected: boolean;
}

@Component({
  selector: 'app-checkout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-modal.component.html',
  styleUrls: ['./checkout-modal.component.css']
})
export class CheckoutModalComponent implements OnInit, OnDestroy {

  @Output() closeModal = new EventEmitter<void>();

  public displayItems: CheckoutItem[] = [];
  public totalSelectedPrice: number = 0;

  customerName = '';
  customerPhone = '';
  customerAddress = '';

  selectedPaymentMethod: string = 'cod';
  generatedOrderId = 'ORDER-' + Date.now();

  private cartSubscription!: Subscription;
  private timer: any;

  constructor(
    public cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartSubscription = this.cartService.items$.subscribe(items => {
      this.displayItems = items.map(i => ({ ...i, isSelected: true }));
      this.updateSelectedTotal();
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) this.cartSubscription.unsubscribe();
  }

  updateSelectedTotal(): void {
    this.totalSelectedPrice = this.displayItems
      .filter(i => i.isSelected)
      .reduce((sum, i) => sum + (i.product.salePrice * i.quantity), 0);
  }

  onManualQuantityChange(event: Event, item: CartItem): void {
    const input = event.target as HTMLInputElement;
    let qty = parseInt(input.value, 10);
    const max = this.getMaxStock(item);

    if (!qty || qty < 1) qty = 1;
    if (qty > max) qty = max;

    this.cartService.updateQuantity(item.uniqueId, qty);
    input.value = qty.toString();
  }

  startChangingQuantity(item: CartItem, delta: number) {
    const max = this.getMaxStock(item);

    if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= max)) return;

    this.changeOne(item, delta);

    this.timer = setTimeout(() => {
      this.timer = setInterval(() => {
        if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= max)) {
          this.stopChangingQuantity();
          return;
        }
        this.changeOne(item, delta);
      }, 100);
    }, 400);
  }

  stopChangingQuantity() {
    if (this.timer) {
      clearTimeout(this.timer);
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private changeOne(item: CartItem, delta: number) {
    if (delta > 0) this.cartService.increaseQuantity(item.uniqueId);
    else this.cartService.decreaseQuantity(item.uniqueId);

    this.cdr.detectChanges();
  }

  /** ============================================================
   *  SAVE TEMP DATA TO LOCALSTORAGE
   * ============================================================ */
  private saveCheckoutTemp() {
    const selectedItems = this.displayItems.filter(i => i.isSelected);

    const tempData = {
      items: selectedItems,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      customerAddress: this.customerAddress,
      generatedOrderId: this.generatedOrderId,
      totalSelectedPrice: this.totalSelectedPrice
    };

    localStorage.setItem("checkoutTemp", JSON.stringify(tempData));
  }

  /** ============================================================
   *  HANDLE CHECKOUT BUTTON
   * ============================================================ */
  handleCheckout(): void {
    if (!this.customerName || !this.customerPhone || !this.customerAddress) {
      alert("Vui lòng nhập đầy đủ thông tin giao hàng!");
      return;
    }

    const selectedItems = this.displayItems.filter(i => i.isSelected);
    if (!selectedItems.length) {
      alert("Bạn chưa chọn sản phẩm!");
      return;
    }

    // 👉 Save temp data for SuccessComponent
    this.saveCheckoutTemp();

    switch (this.selectedPaymentMethod) {
      case "cod":
        this.checkoutCOD();
        break;

      case "momo":
        this.checkoutMomo();
        break;

      case "vnpay":
        this.checkoutVNPay();
        break;

      case "stripe":
        this.checkoutStripe();
        break;
    }
  }

  /** ============================================================
   *  CASH ON DELIVERY
   * ============================================================ */
  checkoutCOD() {
    this.onClose();
    this.router.navigate(['/success'], { queryParams: { payment: "cod" } });
  }

  /** ============================================================
   *  MOMO PAYMENT
   * ============================================================ */
  async checkoutMomo() {
    const payload = {
      amount: this.totalSelectedPrice,
      orderId: this.generatedOrderId
    };

    try {
      const res = await fetch("http://localhost:3001/api/payment/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.payUrl) {
        this.onClose();
        window.location.href = data.payUrl;
      } else {
        alert("Không tạo được thanh toán MoMo");
      }
    } catch (err) {
      console.error(err);
      alert("MoMo lỗi server!");
    }
  }

  /** ============================================================
   *  VNPAY PAYMENT
   * ============================================================ */
  async checkoutVNPay() {
    const url = `http://localhost:3001/api/payment/vnpay?orderId=${this.generatedOrderId}&amount=${this.totalSelectedPrice}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.payUrl) {
        this.onClose();
        window.location.href = data.payUrl;
      } else {
        alert("Không tạo được link thanh toán VNPay");
      }
    } catch (err) {
      console.error(err);
      alert("VNPay lỗi server!");
    }
  }

  /** ============================================================
   *  STRIPE PAYMENT
   * ============================================================ */
  async checkoutStripe() {
    const payload = {
      amount: this.totalSelectedPrice,
      orderId: this.generatedOrderId
    };

    try {
      const res = await fetch("http://localhost:3001/api/payment/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.checkoutUrl) {
        this.onClose();
        window.location.href = data.checkoutUrl;
      } else {
        alert("Stripe lỗi server!");
      }
    } catch (err) {
      console.error(err);
      alert("Không tạo được thanh toán Stripe!");
    }
  }

  onClose() {
    this.closeModal.emit();
  }

  public getMaxStock(item: CartItem): number {
    if (item.product.hasSize && item.product.sizes) {
      const sizeOption = item.product.sizes.find(s => String(s.size) === item.selectedSize);
      return sizeOption ? sizeOption.quantity : 0;
    }
    return item.product.quantity || 0;
  }
}
