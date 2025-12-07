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
  public totalSelectedPrice = 0;

  customerName = '';
  customerPhone = '';
  customerAddress = '';

  selectedPaymentMethod = 'cod';
  generatedOrderId = 'ORDER-' + Date.now();
  private cartSubscription!: Subscription;
  private timer: any;

  constructor(
    public cartService: CartService,
    private cdr: ChangeDetectorRef,
    private firestore: Firestore,
    private router: Router,
    private route: ActivatedRoute,
    private checkoutService: CheckoutModalService
  ) {}

  ngOnInit(): void {
    this.checkoutService.setModalInstance(this);

    // Load cart & customer info từ localStorage nếu quay về sau thanh toán
    const savedCart = JSON.parse(localStorage.getItem('stripeCart') || '[]');
    const savedCustomer = JSON.parse(localStorage.getItem('stripeCustomer') || '{}');
    if (savedCart.length) {
      this.displayItems = savedCart;
      this.customerName = savedCustomer.name || '';
      this.customerPhone = savedCustomer.phone || '';
      this.customerAddress = savedCustomer.address || '';
    }

    this.cartSubscription = this.cartService.items$.subscribe(items => {
      this.displayItems = items.map(i => ({ ...i, isSelected: true }));
      this.updateSelectedTotal();
    });

    // Xử lý query params hoặc localStorage flags sau khi thanh toán
    this.route.queryParams.subscribe(params => this.handlePaymentParams(params));
    this.checkLocalStoragePayment();
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
    this.stopChangingQuantity();
    this.checkoutService.setModalInstance(null);
  }

  private async handlePaymentParams(params: any) {
    const sessionId = params['session_id']; // Stripe
    const resultCode = params['resultCode']; // MoMo / VNPay
    const orderId = params['orderId'];

    if (sessionId) await this.checkStripePayment(sessionId);
    else if (resultCode === '0' && orderId) await this.handlePaymentSuccess();

    if (sessionId || (resultCode === '0' && orderId)) this.clearPaymentFlags();
    this.router.navigate([], { queryParams: {} });
  }

  private checkLocalStoragePayment() {
    const paymentDone = localStorage.getItem('payment_done');
    const paymentMethod = localStorage.getItem('payment_method');
    const paymentSessionId = localStorage.getItem('payment_session_id');

    if (!paymentDone || !paymentMethod) return;
    switch (paymentMethod) {
      case 'stripe': if (paymentSessionId) this.checkStripePayment(paymentSessionId).finally(() => this.clearPaymentFlags()); break;
      case 'momo':
      case 'vnpay': this.handlePaymentSuccess().finally(() => this.clearPaymentFlags()); break;
    }
  }

  async handlePaymentSuccess() {
    try {
      await this.sendOrderEmail();
      this.removeCheckedItems();
      this.cartService.clearCart();
      alert("Thanh toán thành công!");
    } catch (err) {
      console.error("Lỗi xử lý sau thanh toán:", err);
    }
  }

  private clearPaymentFlags() {
    ['payment_done','payment_method','payment_session_id','stripeCart','stripeCustomer'].forEach(k => localStorage.removeItem(k));
  }

  async checkStripePayment(sessionId: string) {
    try {
      const res = await fetch(`http://localhost:3001/api/payment/stripe/status?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.paid) await this.handlePaymentSuccess();
      else alert("Thanh toán Stripe chưa hoàn tất!");
    } catch (err) { console.error("Stripe check failed:", err); }
  }

  updateSelectedTotal() {
    this.totalSelectedPrice = this.displayItems
      .filter(i => i.isSelected)
      .reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0);
  }

  onManualQuantityChange(event: Event, item: CartItem) {
    const input = event.target as HTMLInputElement;
    let value = Math.max(1, Math.min(parseInt(input.value) || 1, this.getMaxStock(item)));
    this.cartService.updateQuantity(item.uniqueId, value);
    input.value = value.toString();
  }

  startChangingQuantity(item: CartItem, delta: number) {
    if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= this.getMaxStock(item))) return;
    this.changeOne(item, delta);
    this.timer = setTimeout(() => {
      this.timer = setInterval(() => {
        if ((delta < 0 && item.quantity <= 1) || (delta > 0 && item.quantity >= this.getMaxStock(item))) this.stopChangingQuantity();
        else this.changeOne(item, delta);
      }, 100);
    }, 400);
  }

  stopChangingQuantity() {
    if (this.timer) { clearTimeout(this.timer); clearInterval(this.timer); this.timer = null; }
  }

  private changeOne(item: CartItem, delta: number) {
    delta > 0 ? this.cartService.increaseQuantity(item.uniqueId) : this.cartService.decreaseQuantity(item.uniqueId);
    this.cdr.detectChanges();
  }

  async handleCheckout() {
    if (!this.customerName || !this.customerPhone || !this.customerAddress) return alert("Vui lòng nhập đầy đủ thông tin");
    if (!this.displayItems.some(i => i.isSelected)) return alert("Chưa chọn sản phẩm!");
    switch (this.selectedPaymentMethod) {
      case "cod": return this.checkoutCOD();
      case "momo": return this.checkoutMomo();
      case "vnpay": return this.checkoutVNPay();
      case "stripe": return this.checkoutStripe();
    }
  }

  private async checkoutCOD() { await this.processOrder("COD"); alert("Đặt hàng thành công! Thanh toán khi nhận hàng."); this.onClose(); }
  private async checkoutMomo() { await this.processOnlinePayment("MOMO", "http://localhost:3001/api/payment/momo"); }
  private async checkoutVNPay() { await this.processOnlinePayment("VNPAY", `http://localhost:3001/api/payment/vnpay?orderId=${this.generatedOrderId}&amount=${this.totalSelectedPrice}`); }
  private async checkoutStripe() { await this.processOnlinePayment("VISA", "http://localhost:3001/api/payment/stripe"); }

  private async processOrder(method: string) {
    await this.saveOrderToFirestore(method);
    await this.updateProductStockAfterOrder();
    await this.sendOrderEmail();
    this.removeCheckedItems();
  }

  private async processOnlinePayment(method: string, url: string) {
    await this.processOrder(method);
    localStorage.setItem('stripeCart', JSON.stringify(this.displayItems));
    localStorage.setItem('stripeCustomer', JSON.stringify({ name: this.customerName, phone: this.customerPhone, address: this.customerAddress }));
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: this.totalSelectedPrice, orderId: this.generatedOrderId }) })
      .then(res => res.json())
      .then(data => {
        const payUrl = data.payUrl || data.checkoutUrl;
        const sessionId = data.sessionId;
        if (!payUrl) return alert(`${method} lỗi backend!`);
        localStorage.setItem('payment_done', 'true');
        localStorage.setItem('payment_method', method.toLowerCase());
        if (sessionId) localStorage.setItem('payment_session_id', sessionId);
        window.location.href = payUrl;
      })
      .catch(err => { console.error(err); alert(`Không thể tạo thanh toán ${method}`); });
  }

  async saveOrderToFirestore(paymentMethod: string) {
    const selectedItems = this.displayItems.filter(i => i.isSelected);
    const groups: Record<string, any[]> = {};
    selectedItems.forEach(item => { const owner = item.product.ownerEmail || "unknown"; if (!groups[owner]) groups[owner] = []; groups[owner].push(item); });
    const orderRef = collection(this.firestore, "orders");
    for (const owner in groups) {
      const items = groups[owner];
      const orderData = {
        createdAt: new Date(),
        customerAddress: this.customerAddress,
        customerName: this.customerName,
        customerPhone: this.customerPhone,
        orderId: this.generatedOrderId + "-" + owner,
        paymentMethod,
        totalPrice: items.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0),
        userId: localStorage.getItem("userId") || null,
        sellerEmail: owner,
        status: "pending",
        items: items.map(i => ({ imageUrl:i.product.imageUrl, name:i.product.productName, ownerEmail:owner, price:i.product.salePrice, productId:i.product.id, quantity:i.quantity, size:i.selectedSize||null }))
      };
      await addDoc(orderRef, orderData);
    }
  }

  async updateProductStockAfterOrder() {
    for (const item of this.displayItems.filter(i => i.isSelected)) {
      try {
        const productRef = doc(this.firestore, "products", item.product.id);
        const snap = await getDoc(productRef);
        if (!snap.exists()) continue;
        const data: any = snap.data();
        if (item.selectedSize && data.sizes) await updateDoc(productRef, { sizes: data.sizes.map((s:any) => s.size == item.selectedSize ? { ...s, quantity: Math.max(0, s.quantity - item.quantity) } : s) });
        else await updateDoc(productRef, { quantity: Math.max(0, (data.quantity||0)-item.quantity) });
      } catch(e){ console.error("Lỗi cập nhật tồn kho:", e); }
    }
  }

  async sendOrderEmail() {
    const userId = localStorage.getItem("userId");
    if (!userId) return console.error("User email not found");
    const snap = await getDoc(doc(this.firestore,"users",userId));
    const email = snap.exists() ? snap.data()['email'] : null;
    if (!email) return console.error("User email not found");
    await fetch("http://localhost:3001/api/order/send-email", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, customerName:this.customerName, orderId:this.generatedOrderId, items:this.displayItems.filter(i=>i.isSelected), total:this.totalSelectedPrice, address:this.customerAddress, phone:this.customerPhone }) });
  }

  onClose(){ this.closeModal.emit(); }

  getMaxStock(item: CartItem) { return item.product.hasSize && item.product.sizes ? (item.product.sizes.find(s=>String(s.size)===item.selectedSize)?.quantity||0) : (item.product.quantity||0); }

  private removeCheckedItems() { this.displayItems.filter(i=>i.isSelected).forEach(i=>this.cartService.removeFromCart(i.uniqueId)); }
}
