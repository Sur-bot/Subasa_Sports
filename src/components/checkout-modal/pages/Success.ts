import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { CartService } from '../../servives/cart.service';
import { isPlatformBrowser, CommonModule } from '@angular/common';


@Component({
  selector: 'app-success',
  imports: [CommonModule],
  templateUrl: './Success.html',
  styleUrls: ['./Success.css']
})
export class SuccessComponent implements OnInit {

  isProcessing = true;        // <-- Loading
  isSuccess = false;          // <-- Thành công
  errorMessage = "";          // <-- Nếu lỗi

  displayItems: any[] = [];

  customerName = "";
  customerPhone = "";
  customerAddress = "";

  generatedOrderId = "";
  totalSelectedPrice = 0;

  constructor(
    private route: ActivatedRoute,
    private firestore: Firestore,
    private cartService: CartService,
    @Inject(PLATFORM_ID) private platformId: any
  ) { }

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    const resultCode = this.route.snapshot.queryParamMap.get("resultCode");

    if (resultCode === "1006") {
      window.location.href = "/";
      return;
    }

    this.generatedOrderId = this.route.snapshot.queryParamMap.get("orderId") || "";
    const paymentMethod = this.route.snapshot.queryParamMap.get("paymentMethod") || "unknown";

    if (!this.generatedOrderId) {
      this.errorMessage = "Không tìm thấy mã đơn hàng!";
      this.isProcessing = false;
      return;
    }

    try {
      this.loadCartAndUserInfo();

      await this.saveOrderToFirestore(paymentMethod);
      await this.updateProductStockAfterOrder();
      await this.sendOrderEmail();

      this.removeCheckedItems();
      localStorage.removeItem("selectedCart");

      this.isProcessing = false;
      this.isSuccess = true;

      console.log("✔ Toàn bộ xử lý đơn hàng thành công!");

      // Redirect home sau 3 giây
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);

    } catch (err) {
      this.errorMessage = "Có lỗi xảy ra khi xử lý đơn hàng.";
      this.isProcessing = false;
    }
  }

  private loadCartAndUserInfo() {
    if (!isPlatformBrowser(this.platformId)) return;

    const raw = localStorage.getItem("checkoutTemp");
    if (!raw) return;

    const temp = JSON.parse(raw);

    this.displayItems = temp.items || [];
    this.totalSelectedPrice = temp.totalSelectedPrice || 0;

    this.customerName = temp.customerName;
    this.customerPhone = temp.customerPhone;
    this.customerAddress = temp.customerAddress;
  }

  private async saveOrderToFirestore(paymentMethod: string) {
    const selected = this.displayItems.filter(i => i.isSelected);

    const groups: Record<string, any[]> = {};
    selected.forEach(item => {
      const owner = item.product.ownerEmail || "unknown";
      if (!groups[owner]) groups[owner] = [];
      groups[owner].push(item);
    });

    const orderRef = collection(this.firestore, "orders");

    for (const ownerEmail in groups) {
      const items = groups[ownerEmail];

      await addDoc(orderRef, {
        createdAt: new Date(),
        orderId: this.generatedOrderId + "-" + ownerEmail,
        customerName: this.customerName,
        customerPhone: this.customerPhone,
        customerAddress: this.customerAddress,
        sellerEmail: ownerEmail,
        paymentMethod: paymentMethod,
        status: "pending",
        userId: localStorage.getItem("userId"),
        totalPrice: items.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0),
        items: items.map(i => ({
          productId: i.product.id,
          name: i.product.productName,
          ownerEmail,
          price: i.product.salePrice,
          quantity: i.quantity,
          size: i.selectedSize,
          imageUrl: i.product.imageUrl
        }))
      });
    }
  }

  private async updateProductStockAfterOrder() {
    const selected = this.displayItems.filter(i => i.isSelected);

    for (const item of selected) {
      const ref = doc(this.firestore, "products", item.product.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) continue;

      const data: any = snap.data();

      if (item.selectedSize && data.sizes) {
        const updated = data.sizes.map((s: any) =>
          String(s.size) === String(item.selectedSize)
            ? { ...s, quantity: s.quantity - item.quantity }
            : s
        );
        await updateDoc(ref, { sizes: updated });
      } else {
        await updateDoc(ref, {
          quantity: (data.quantity || 0) - item.quantity
        });
      }
    }
  }

  private async sendOrderEmail() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const ref = doc(this.firestore, "users", userId);
    const snap = await getDoc(ref);
    const email = snap.exists() ? snap.data()["email"] : "";

    if (!email) return;

    const selected = this.displayItems.filter(i => i.isSelected);

    await fetch("http://localhost:3001/api/order/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        customerName: this.customerName,
        orderId: this.generatedOrderId,
        items: selected,
        total: this.totalSelectedPrice,
        address: this.customerAddress,
        phone: this.customerPhone
      })
    });
  }

  private removeCheckedItems() {
    this.displayItems
      .filter(i => i.isSelected)
      .forEach(i => this.cartService.removeFromCart(i.uniqueId));
  }
}
