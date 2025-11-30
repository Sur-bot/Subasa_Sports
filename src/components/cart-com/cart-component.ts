import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, combineLatest, map } from 'rxjs';
import { CartService, CartItem } from '../servives/cart.service';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';
import { Firestore, collection, query, where, getDocs, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { UserService } from '../menu-com/UserService';

interface CartViewModel {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

interface OrderItem {
  name: string;
  imageUrl: string;
  quantity: number;
  price: number;
  ownerEmail: string;
  productId: string;
  size: string;
}

interface Order {
  docId?: string;
  orderId: string;
  createdAt: any;
  totalPrice: number;
  status: 'pending' | 'shipping' | 'delivered' | 'cancel';
  ownerEmail: string;
  userEmail: string;
  userId?: string;      
  items: OrderItem[];
  customerPhone: string;
  customerName: string;
  customerAddress: string;
}

interface OrderHistoryGrouped {
  pending: Order[];
  shipping: Order[];
  delivered: Order[];
  cancel: Order[];
}

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart-component.html',
  styleUrls: ['./cart-component.css'],
  imports: [CommonModule, RouterLink, CheckoutModalComponent],
})
export class CartComponent implements OnInit {
  public readonly vm$: Observable<CartViewModel>;
  public isCheckoutModalVisible = false;
  public isOrderHistoryVisible = false;
  public isSellerPopupVisible = false;
  public isSeller = false;
  public currentUser: User | null = null;

  public orderHistory: OrderHistoryGrouped = {
    pending: [],
    shipping: [],
    delivered: [],
    cancel: [],
  };

  public sellerOrders: Order[] = [];
  private timer: any;

  constructor(
    public cartService: CartService,
    private auth: Auth,
    private userService: UserService,
    private firestore: Firestore,
    private cdr: ChangeDetectorRef
  ) {
    this.vm$ = combineLatest([
      this.cartService.items$,
      this.cartService.totalItems$,
      this.cartService.totalPrice$,
    ]).pipe(map(([items, totalItems, totalPrice]) => ({ items, totalItems, totalPrice })));
  }

  ngOnInit() {
    // Lắng nghe role từ UserService
    this.userService.role$.subscribe(role => {
      this.isSeller = role === 'seller';
      this.cdr.detectChanges();
    });

    // Lắng nghe auth state
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUser = user;

      if (user) {
        localStorage.setItem('userId', user.uid);

        if (this.isSeller) {
          await this.loadSellerOrders(); // <-- dùng email từ auth
        } else {
          await this.loadOrderHistoryForUser(user.uid);
        }
      } else {
        localStorage.removeItem('userId');
      }

      this.cdr.detectChanges();
    });
  }

  // ===================
  // Buyer - load orders theo userId
  private async loadOrderHistoryForUser(userId: string) {
    try {
      const ordersRef = collection(this.firestore, 'orders');
      const q = query(ordersRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const allOrders: Order[] = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id,
      } as Order));

      this.orderHistory.pending = allOrders.filter(o => o.status === 'pending');
      this.orderHistory.shipping = allOrders.filter(o => o.status === 'shipping');
      this.orderHistory.delivered = allOrders.filter(o => o.status === 'delivered');
      this.orderHistory.cancel = allOrders.filter(o => o.status === 'cancel');

      this.cdr.detectChanges();
    } catch (err) {
      console.error(err);
    }
  }

  // ===================
  // Seller - load orders theo email trực tiếp từ auth
  private async getUserEmailById(userId: string): Promise<string | null> {
  try {
    const userRef = doc(this.firestore, 'users', userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return snap.data()['email'] || null;
    }
    return null;
  } catch (error) {
    console.error('Cannot get user email', error);
    return null;
  }
}
  private async loadSellerOrders() {
  if (!this.currentUser?.email) return;

  try {
    const sellerEmail = this.currentUser.email.toLowerCase();
    const ordersRef = collection(this.firestore, 'orders');
    const snapshotOrders = await getDocs(ordersRef);

    // Tạo danh sách orders ban đầu
    const rawOrders = snapshotOrders.docs
      .map(doc => ({ ...doc.data(), docId: doc.id } as Order))
      .filter(order =>
        order.items.some(item => item.ownerEmail?.toLowerCase() === sellerEmail)
      );

    // Truy ngược userEmail từ userId
    for (let order of rawOrders) {
      if (order.userId) {
        order.userEmail = await this.getUserEmailById(order.userId) ?? 'N/A';
      }
    }

    this.sellerOrders = rawOrders;
    this.cdr.detectChanges();
  } catch (err) {
    console.error(err);
  }
}



  public openSellerOrders() {
    this.isSellerPopupVisible = true;
    this.loadSellerOrders();
  }

  public closeSellerOrders() {
    this.isSellerPopupVisible = false;
  }

  public openOrderHistory() {
    this.isOrderHistoryVisible = true;
  }

  public closeOrderHistory() {
    this.isOrderHistoryVisible = false;
  }

  public get orderStatuses() {
    return ['pending', 'shipping', 'delivered', 'cancel'] as const;
  }

  public getOrdersByStatus(status: 'pending' | 'shipping' | 'delivered' | 'cancel') {
    return this.orderHistory[status] ?? [];
  }

  public async updateOrderStatus(order: Order) {
    const next =
      order.status === 'pending'
        ? 'shipping'
        : order.status === 'shipping'
        ? 'delivered'
        : order.status;
      this.cdr.detectChanges();
    if (order.status === next) return;

    await updateDoc(doc(this.firestore, 'orders', order.docId!), { status: next });

    order.status = next;
    this.cdr.detectChanges();
  }

  public async cancelOrder(order: Order) {
    await updateDoc(doc(this.firestore, 'orders', order.docId!), { status: 'cancel' });
    order.status = 'cancel';
    this.cdr.detectChanges();
  }

  /** CART — STOCK */
  public getMaxStock(item: CartItem): number {
    if (item.product.hasSize && item.product.sizes) {
      const sizeOption = item.product.sizes.find((s) => String(s.size) === item.selectedSize);
      return sizeOption ? sizeOption.quantity : 0;
    }
    return item.product.quantity ?? 0;
  }

  public onManualQuantityChange(event: Event, item: CartItem) {
    const input = event.target as HTMLInputElement;
    let val = parseInt(input.value, 10);
    const max = this.getMaxStock(item);

    if (isNaN(val) || val < 1) val = 1;
    if (val > max) val = max;

    this.cartService.updateQuantity(item.uniqueId, val);
    input.value = val.toString();
  }

  public startChangingQuantity(item: CartItem, delta: number) {
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
      }, 120);
    }, 400);
  }

  public stopChangingQuantity() {
    if (!this.timer) return;
    clearTimeout(this.timer);
    clearInterval(this.timer);
    this.timer = null;
  }

  private changeOne(item: CartItem, delta: number) {
    if (delta > 0) this.cartService.increaseQuantity(item.uniqueId);
    else this.cartService.decreaseQuantity(item.uniqueId);

    this.cdr.detectChanges();
  }
}
