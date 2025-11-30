import { Component, Output, EventEmitter, OnInit, OnDestroy,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../servives/cart.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, CollectionReference, serverTimestamp } from '@angular/fire/firestore';


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
  showBankInfo = false;

  generatedOrderId = 'ORDER-' + Date.now();
  private cartSubscription!: Subscription;
  private timer: any;
  
  constructor(
    public cartService: CartService,
    private cdr: ChangeDetectorRef,
    private firestore: Firestore,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cartSubscription = this.cartService.items$.subscribe(items => {
      this.displayItems = items.map(item => ({
        ...item,
        isSelected: true
      }));
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
    const inputElement = event.target as HTMLInputElement;
    let newValue = parseInt(inputElement.value, 10);
    const maxStock = this.getMaxStock(item);

    // Validate
    if (isNaN(newValue) || newValue < 1) {
      newValue = 1;
    }
    if (newValue > maxStock) {
      newValue = maxStock;
    }

    this.cartService.updateQuantity(item.uniqueId, newValue);
    
    
    inputElement.value = newValue.toString();
  }

  // --- LOGIC ẤN GIỮ (LONG PRESS) ---
  
  // Bắt đầu ấn giữ
  startChangingQuantity(item: CartItem, delta: number) {
    const maxStock = this.getMaxStock(item);

    // Kiểm tra điều kiện giới hạn
    if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= maxStock)) return;

    // 1. Thay đổi ngay 1 lần (Click đơn)
    this.changeOne(item, delta);

    // 2. Đợi 400ms, nếu vẫn giữ chuột thì chạy liên tục
    this.timer = setTimeout(() => {
      this.timer = setInterval(() => {
        // Kiểm tra lại trong vòng lặp
        if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= maxStock)) {
          this.stopChangingQuantity();
          return;
        }
        this.changeOne(item, delta);
      }, 100); // Tốc độ 100ms
    }, 400);
  }

  // Thả tay ra -> Dừng lại
  stopChangingQuantity() {
    if (this.timer) {
      clearTimeout(this.timer);
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Hàm phụ trợ để gọi service và vẽ lại màn hình
  private changeOne(item: CartItem, delta: number) {
    if (delta > 0) {
        this.cartService.increaseQuantity(item.uniqueId);
    } else {
        this.cartService.decreaseQuantity(item.uniqueId);
    }
    this.cdr.detectChanges(); 
  }

  /** ============================================================
   *  SAVE ORDER TO FIRESTORE
   * ============================================================ */
  private async saveOrderToFirestore(paymentMethod: string) {
    const selectedItems = this.displayItems.filter(i => i.isSelected);

    const orderData = {
      orderId: this.generatedOrderId || 'ORDER-unknown',
      userId: localStorage.getItem("userId") || null,
      customerName: this.customerName || 'Khách hàng',
      customerPhone: this.customerPhone || '',
      customerAddress: this.customerAddress || '',
      paymentMethod: paymentMethod || 'unknown',
      totalPrice: this.totalSelectedPrice ?? 0,
      status: 'PENDING',
      createdAt: new Date(),
      items: selectedItems.map(item => ({
        productId: item.product.id || 'unknown',
        name: item.product.productName || 'No name',
        ownerEmail: item.product.ownerEmail || 'unknown',
        price: item.product.salePrice ?? 0,
        imageUrl: item.product.imageUrl || '',
        quantity: item.quantity ?? 1,
        size: item.selectedSize || null
      }))
    };


    const orderRef = collection(this.firestore, 'orders');
    await addDoc(orderRef, orderData);

  }


  /** ============================================================
   *  CHECKOUT MAIN HANDLER
   * ============================================================ */
  handleCheckout(): void {
    if (!this.customerName || !this.customerPhone || !this.customerAddress) {
      alert("Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ!");
      return;
    }

    const selectedItems = this.displayItems.filter(i => i.isSelected);
    if (selectedItems.length === 0) {
      alert("Bạn chưa chọn sản phẩm!");
      return;
    }

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
      case "bank":
        this.checkoutBankTransfer();
        break;
    }
  }


  /** ============================================================
   *  COD
   * ============================================================ */
  async checkoutCOD() {
    await this.saveOrderToFirestore("COD");

    this.removeCheckedItems(); // Xoá item đã chọn

    alert("Đặt hàng thành công! Thanh toán khi nhận hàng.");

    this.onClose();
    this.router.navigate(['/']); // về trang chủ
  }


  /** ============================================================
   *  MOMO
   * ============================================================ */
  async checkoutMomo() {
    await this.saveOrderToFirestore("MOMO");

   

    const payload = {
      amount: this.totalSelectedPrice,
      orderId: this.generatedOrderId
    };

    fetch("http://localhost:3001/api/payment/momo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
      
    })
      .then(res => res.json())
      .then(data => {
        if (!data.payUrl) {
          alert("Lỗi: không tìm thấy MoMo payUrl");
        } else {
          this.onClose();
          this.router.navigate(['/']);
          window.location.href = data.payUrl;
        }
      })
      .catch(err => {
        console.error(err);
        alert("Không thể tạo thanh toán MoMo");
      });
      this.removeCheckedItems();
      setTimeout(() => {
      this.onClose();
      this.router.navigate(['/']);
    }, 2000);
  }


  /** ============================================================
   *  VNPAY
   * ============================================================ */
  async checkoutVNPay() {
    await this.saveOrderToFirestore("VNPAY");

    

    const url = `http://localhost:3001/api/payment/vnpay?orderId=${this.generatedOrderId}&amount=${this.totalSelectedPrice}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!data.payUrl) {
          alert("Lỗi: không tìm thấy VNPay payUrl");
        } else {
          this.onClose();
          this.router.navigate(['/']);
          window.location.href = data.payUrl;
        }
      })
      .catch(err => {
        console.error(err);
        alert("Không thể tạo thanh toán VNPay");
      });
      this.removeCheckedItems();
  }


  /** ============================================================
   *  BANK TRANSFER
   * ============================================================ */
  async checkoutBankTransfer() {
    await this.saveOrderToFirestore("BANK_TRANSFER");

    this.removeCheckedItems();

    this.showBankInfo = true;

    // Sau khi hiện thông tin, đóng modal và về home
    setTimeout(() => {
      this.onClose();
      this.router.navigate(['/']);
    }, 1500);
  }



  onClose() {
    this.closeModal.emit();
  }

  public getMaxStock(item: CartItem): number {
    if (item.product.hasSize && item.product.sizes) {
      const sizeOption = item.product.sizes.find(s => String(s.size) === item.selectedSize);
      return sizeOption ? sizeOption.quantity : 0;
    } else {
      return item.product.quantity || 0;
    }
  }

  private removeCheckedItems() {
    this.displayItems
      .filter(item => item.isSelected)
      .forEach(item => {
        this.cartService.removeFromCart(item.uniqueId);
      });
  }

}
