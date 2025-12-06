import { Component, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../servives/cart.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, CollectionReference, serverTimestamp, doc, getDoc, updateDoc } from '@angular/fire/firestore';

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

    if (isNaN(newValue) || newValue < 1) {
      newValue = 1;
    }
    if (newValue > maxStock) {
      newValue = maxStock;
    }

    this.cartService.updateQuantity(item.uniqueId, newValue);
    inputElement.value = newValue.toString();
  }

  // Long press logic
  startChangingQuantity(item: CartItem, delta: number) {
    const maxStock = this.getMaxStock(item);

    if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= maxStock)) return;

    this.changeOne(item, delta);

    this.timer = setTimeout(() => {
      this.timer = setInterval(() => {
        if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= maxStock)) {
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

    const groups: Record<string, any[]> = {};

    selectedItems.forEach(item => {
      const owner = item.product.ownerEmail || "unknown";
      if (!groups[owner]) groups[owner] = [];
      groups[owner].push(item);
    });

    const orderRef = collection(this.firestore, "orders");

    for (const ownerEmail in groups) {
      const items = groups[ownerEmail];

      const orderData = {
        createdAt: new Date(),
        customerAddress: this.customerAddress,
        customerName: this.customerName,
        customerPhone: this.customerPhone,

        orderId: this.generatedOrderId + "-" + ownerEmail,
        paymentMethod: paymentMethod,
        totalPrice: items.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0),
        userId: localStorage.getItem("userId") || null,
        sellerEmail: ownerEmail,
        status: "pending",
        items: items.map(i => ({
          imageUrl: i.product.imageUrl,
          name: i.product.productName,
          ownerEmail: ownerEmail,
          price: i.product.salePrice,
          productId: i.product.id,
          quantity: i.quantity,
          size: i.selectedSize || null,
        }))
      };

      await addDoc(orderRef, orderData);
    }
  }

  /** ============================================================
   *  UPDATE PRODUCT STOCK AFTER ORDER
   * ============================================================ */
  private async updateProductStockAfterOrder() {
    const selectedItems = this.displayItems.filter(i => i.isSelected);

    for (const item of selectedItems) {
      try {
        const productRef = doc(this.firestore, "products", item.product.id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) continue;

        const productData: any = productSnap.data();

        if (item.selectedSize && productData.sizes) {
          const updatedSizes = productData.sizes.map((s: any) => {
            if (String(s.size) === String(item.selectedSize)) {
              return {
                ...s,
                quantity: Math.max(0, s.quantity - item.quantity)
              };
            }
            return s;
          });

          await updateDoc(productRef, { sizes: updatedSizes });
        }
        else {
          const newQuantity = Math.max(0, (productData.quantity || 0) - item.quantity);
          await updateDoc(productRef, { quantity: newQuantity });
        }

      } catch (err) {
        console.error("Lỗi cập nhật tồn kho:", err);
      }
    }
  }


  /** ============================================================
   *  GỬI EMAIL
   * ============================================================ */
  private async sendOrderEmail() {
  const userId = localStorage.getItem("userId");

  let email = "";
  if (userId) {
    email = await this.getUserEmailById(userId) || "";
  }

  if (!email) {
    console.error("❌ Cannot send email: user email not found");
    return;
  }

  const selectedItems = this.displayItems.filter(i => i.isSelected);

  await fetch("http://localhost:3001/api/order/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      customerName: this.customerName,
      orderId: this.generatedOrderId,
      items: selectedItems,
      total: this.totalSelectedPrice,
      address: this.customerAddress,
      phone: this.customerPhone
    })
  });
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
      case "stripe":
        this.checkoutStripe();
        break;
    }
  }


  /** ============================================================
   *  COD
   * ============================================================ */
  async checkoutCOD() {
    await this.saveOrderToFirestore("COD");
    await this.updateProductStockAfterOrder();

    await this.sendOrderEmail(); // ⭐️ THÊM DÒNG NÀY

    this.removeCheckedItems();

    alert("Đặt hàng thành công! Thanh toán khi nhận hàng.");

    this.onClose();
    this.router.navigate(['/']);
  }


  /** ============================================================
   *  MOMO
   * ============================================================ */
  async checkoutMomo() {
    await this.saveOrderToFirestore("MOMO");
    await this.updateProductStockAfterOrder();

    await this.sendOrderEmail(); // ⭐️ THÊM DÒNG NÀY

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
    await this.updateProductStockAfterOrder();

    await this.sendOrderEmail(); // ⭐️ THÊM DÒNG NÀY

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
   *  Stripe
   * ============================================================ */
  async checkoutStripe() {
    await this.saveOrderToFirestore("VISA");
    await this.updateProductStockAfterOrder();

    await this.sendOrderEmail(); // ⭐️ THÊM DÒNG NÀY

    const payload = {
      amount: this.totalSelectedPrice,
      orderId: this.generatedOrderId
    };

    fetch("http://localhost:3001/api/payment/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        console.log("Stripe response:", data);

        if (!data.checkoutUrl) {
          alert("Stripe lỗi backend!");
          return;
        }

        window.location.href = data.checkoutUrl;
      })
      .catch(err => {
        console.error("Stripe error:", err);
        alert("Không gọi được Stripe server!");
      });

    this.removeCheckedItems();
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
private async getUserEmailById(userId: string): Promise<string | null> {
  const userRef = doc(this.firestore, "users", userId);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data()['email'] || null;
  }

  return null;
}

  private removeCheckedItems() {
    this.displayItems
      .filter(item => item.isSelected)
      .forEach(item => {
        this.cartService.removeFromCart(item.uniqueId);
      });
  }
}
