import { Component, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../servives/cart.service';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { CheckoutModalService } from '../servives/checkout-modal.service';

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
  public showModal: boolean = false;

  constructor(
    public cartService: CartService,
    private cdr: ChangeDetectorRef,
    private firestore: Firestore,
    private router: Router,
    private route: ActivatedRoute,
    private checkoutService: CheckoutModalService
  ) {}

  ngOnInit(): void {
    // đăng ký instance modal
    this.checkoutService.setModalInstance(this);

    // load cart + customer từ localStorage
    const savedCart = JSON.parse(localStorage.getItem('stripeCart') || '[]');
    const savedCustomer = JSON.parse(localStorage.getItem('stripeCustomer') || '{}');
    if (savedCart.length) {
      this.displayItems = savedCart;
      this.customerName = savedCustomer.name || '';
      this.customerPhone = savedCustomer.phone || '';
      this.customerAddress = savedCustomer.address || '';
    }

    // Subscribe cart changes
    this.cartSubscription = this.cartService.items$.subscribe(items => {
      this.displayItems = items.map(item => ({ ...item, isSelected: true }));
      this.updateSelectedTotal();
    });

    // **check localStorage payment_done ngay khi load**
    const paymentDone = localStorage.getItem('payment_done');
    const paymentMethod = localStorage.getItem('payment_method');
    const paymentSessionId = localStorage.getItem('payment_session_id');

    if (paymentDone === 'true' && paymentMethod) {
      // bật modal và handle ngay
      if (this.checkoutService.modalInstance) {
        this.checkoutService.modalInstance.showModal = true;
        this.handleAfterPayment(paymentMethod, paymentSessionId);
      }
    }

    // xử lý query params Stripe / MoMo / VNPay
    this.route.queryParams.subscribe(async params => {
      const sessionId = params['session_id']; // Stripe
      const resultCode = params['resultCode']; // MoMo/VNPay
      const orderId = params['orderId'];

      if (sessionId) {
        this.showModalAndHandle('stripe', sessionId);
      } else if (resultCode === "0" && orderId) {
        this.showModalAndHandle('momo', null);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.cartSubscription) this.cartSubscription.unsubscribe();
    this.stopChangingQuantity();
  }

  private async handleAfterPayment(method: string, sessionId: string | null) {
    switch (method) {
      case 'stripe':
        if (sessionId) await this.checkStripePayment(sessionId);
        break;
      case 'momo':
      case 'vnpay':
        await this.handlePaymentSuccess();
        break;
    }
    this.clearPaymentFlags();
  }

  private showModalAndHandle(method: string, sessionId: string | null) {
    if (this.checkoutService.modalInstance) {
      this.checkoutService.modalInstance.showModal = true;
      this.handleAfterPayment(method, sessionId);
    }
  }

  async handlePaymentSuccess() {
    try {
      await this.sendOrderEmail();
      this.removeCheckedItems();
    } catch (err) {
      console.error("Lỗi khi xử lý sau thanh toán:", err);
    }
  }

  private clearPaymentFlags() {
    localStorage.removeItem('payment_done');
    localStorage.removeItem('payment_method');
    localStorage.removeItem('payment_session_id');
    localStorage.removeItem('stripeCart');
    localStorage.removeItem('stripeCustomer');
  }

  async checkStripePayment(sessionId: string) {
    try {
      const res = await fetch(`http://localhost:3001/api/payment/stripe/status?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.paid) await this.handlePaymentSuccess();
      else alert("Thanh toán Stripe chưa hoàn tất!");
    } catch (err) {
      console.error("Stripe check failed:", err);
    }
  }

  updateSelectedTotal(): void {
    this.totalSelectedPrice = this.displayItems
      .filter(i => i.isSelected)
      .reduce((sum, i) => sum + (i.product.salePrice * i.quantity), 0);
  }

  onManualQuantityChange(event: Event, item: CartItem): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value, 10);
    const max = this.getMaxStock(item);
    if (isNaN(value) || value < 1) value = 1;
    if (value > max) value = max;
    this.cartService.updateQuantity(item.uniqueId, value);
    input.value = value.toString();
  }

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
    delta > 0 ? this.cartService.increaseQuantity(item.uniqueId) : this.cartService.decreaseQuantity(item.uniqueId);
    this.cdr.detectChanges();
  }

  async saveOrderToFirestore(paymentMethod: string) {
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
        paymentMethod,
        totalPrice: items.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0),
        userId: localStorage.getItem("userId") || null,
        sellerEmail: ownerEmail,
        status: "pending",
        items: items.map(i => ({
          imageUrl: i.product.imageUrl,
          name: i.product.productName,
          ownerEmail,
          price: i.product.salePrice,
          productId: i.product.id,
          quantity: i.quantity,
          size: i.selectedSize || null,
        }))
      };
      await addDoc(orderRef, orderData);
    }
  }

  async updateProductStockAfterOrder() {
    const selectedItems = this.displayItems.filter(i => i.isSelected);
    for (const item of selectedItems) {
      try {
        const productRef = doc(this.firestore, "products", item.product.id);
        const snap = await getDoc(productRef);
        if (!snap.exists()) continue;
        const productData: any = snap.data();
        if (item.selectedSize && productData.sizes) {
          const updatedSizes = productData.sizes.map((s: any) =>
            s.size == item.selectedSize ? { ...s, quantity: Math.max(0, s.quantity - item.quantity) } : s
          );
          await updateDoc(productRef, { sizes: updatedSizes });
        } else {
          const newQty = Math.max(0, (productData.quantity || 0) - item.quantity);
          await updateDoc(productRef, { quantity: newQty });
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  async sendOrderEmail() {
    const userId = localStorage.getItem("userId");
    let email = "";
    if (userId) email = await this.getUserEmailById(userId) || "";
    if (!email) return;

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

  handleCheckout(): void {
    if (!this.customerName || !this.customerPhone || !this.customerAddress) return alert("Vui lòng nhập đầy đủ thông tin");
    if (!this.displayItems.some(i => i.isSelected)) return alert("Chưa chọn sản phẩm!");
    switch (this.selectedPaymentMethod) {
      case "cod": this.checkoutCOD(); break;
      case "momo": this.checkoutMomo(); break;
      case "vnpay": this.checkoutVNPay(); break;
      case "stripe": this.checkoutStripe(); break;
    }
  }

  async checkoutCOD() {
    await this.saveOrderToFirestore("COD");
    await this.updateProductStockAfterOrder();
    await this.sendOrderEmail();
    this.removeCheckedItems();
    alert("Đặt hàng thành công! Thanh toán khi nhận hàng.");
    this.onClose();
  }

  async checkoutMomo() {
    await this.saveOrderToFirestore("MOMO");
    await this.updateProductStockAfterOrder();
    localStorage.setItem('stripeCart', JSON.stringify(this.displayItems));
    localStorage.setItem('stripeCustomer', JSON.stringify({
      name: this.customerName,
      phone: this.customerPhone,
      address: this.customerAddress
    }));

    const payload = { amount: this.totalSelectedPrice, orderId: this.generatedOrderId };
    fetch("http://localhost:3001/api/payment/momo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (!data.payUrl) return alert("Không tìm thấy MoMo payUrl");
        localStorage.setItem('payment_done', 'true');
        localStorage.setItem('payment_method', 'momo');
        window.location.href = data.payUrl;
      }).catch(err => {
        console.error(err);
        alert("Không thể tạo thanh toán MoMo");
      });
  }

  async checkoutVNPay() {
    await this.saveOrderToFirestore("VNPAY");
    await this.updateProductStockAfterOrder();
    localStorage.setItem('stripeCart', JSON.stringify(this.displayItems));
    localStorage.setItem('stripeCustomer', JSON.stringify({
      name: this.customerName,
      phone: this.customerPhone,
      address: this.customerAddress
    }));

    const url = `http://localhost:3001/api/payment/vnpay?orderId=${this.generatedOrderId}&amount=${this.totalSelectedPrice}`;
    fetch(url).then(res => res.json())
      .then(data => {
        if (!data.payUrl) return alert("Không tìm thấy VNPay payUrl");
        localStorage.setItem('payment_done', 'true');
        localStorage.setItem('payment_method', 'vnpay');
        window.location.href = data.payUrl;
      }).catch(err => {
        console.error(err);
        alert("Không thể tạo thanh toán VNPay");
      });
  }

  async checkoutStripe() {
    await this.saveOrderToFirestore("VISA");
    await this.updateProductStockAfterOrder();
    localStorage.setItem('stripeCart', JSON.stringify(this.displayItems));
    localStorage.setItem('stripeCustomer', JSON.stringify({
      name: this.customerName,
      phone: this.customerPhone,
      address: this.customerAddress
    }));

    const payload = { amount: this.totalSelectedPrice, orderId: this.generatedOrderId };
    fetch("http://localhost:3001/api/payment/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (!data.checkoutUrl || !data.sessionId) return alert("Stripe lỗi backend!");
        localStorage.setItem('payment_done', 'true');
        localStorage.setItem('payment_method', 'stripe');
        localStorage.setItem('payment_session_id', data.sessionId);
        window.location.href = data.checkoutUrl;
      }).catch(err => {
        console.error("Stripe error:", err);
        alert("Không gọi được Stripe server!");
      });
  }

  onClose() {
    this.closeModal.emit();
  }

  public getMaxStock(item: CartItem): number {
    if (item.product.hasSize && item.product.sizes) {
      const s = item.product.sizes.find(s => String(s.size) === item.selectedSize);
      return s ? s.quantity : 0;
    }
    return item.product.quantity || 0;
  }

  private async getUserEmailById(userId: string): Promise<string | null> {
    const snap = await getDoc(doc(this.firestore, "users", userId));
    return snap.exists() ? snap.data()['email'] || null : null;
  }

  private removeCheckedItems() {
    this.displayItems.filter(i => i.isSelected).forEach(i => this.cartService.removeFromCart(i.uniqueId));
  }
}
