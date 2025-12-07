import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

// components
import { CategoryComponent } from '../category-com/category-component';
import { BannerComponent } from '../banner-com/banner-component';
import { ChatSupportComponent } from '../chat-com/chat-component';
import { AdminDashboardComponent } from '../chat-com/AdminDashboardComponent';
import { NotificationFloatingComponent } from '../notificationfloating-com/notification-floating-component';
import { FloatingMenuComponent } from '../menu-com/floating-menu';
import { RequestSellerComponent } from '../request-seller-com/request-seller';
import { UserService } from '../menu-com/UserService';
import { FlashSaleSectionComponent } from '../flashsalesection-com/flash-sale-section.component';
import { Product } from '../product-card/product-card.component';
import { ProductOptionsModalComponent } from '../product-options-modal/product-options-modal.component';
import { AdminSellerRequestsComponent } from '../request-seller-com/admin-seller-requests';
import { BrandSliderComponent } from '../brand-com/brand-component';
import { CartService } from '../servives/cart.service';
import { CheckoutModalService } from '../servives/checkout-modal.service';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';

const ADMIN_UID = "ucqeK6JbQMViknAiaXDya5iufeE3";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    BannerComponent,
    CategoryComponent,
    ChatSupportComponent,
    AdminDashboardComponent,
    NotificationFloatingComponent,
    FloatingMenuComponent,
    FlashSaleSectionComponent,
    ProductOptionsModalComponent,
    RequestSellerComponent,
    AdminSellerRequestsComponent,
    FormsModule,
    BrandSliderComponent,
    CommonModule,
    CheckoutModalComponent
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  userId: string = '';
  isAdmin = false;
  role: string | null = null;

  selectedProductForModal: Product | null = null;
  isModalOpen: boolean = false;

  constructor(
    private auth: Auth,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private cartService: CartService,
    private checkoutService: CheckoutModalService
  ) {
    this.userService.role$.subscribe(r => this.role = r);
  }

  ngOnInit() {
    // --- Auth state ---
    onAuthStateChanged(this.auth, (user) => {
      localStorage.setItem('isGuest', 'true');
      this.ngZone.run(() => {
        if (user) {
          this.currentUser = user;
          let storedId = localStorage.getItem('userId');
          if (!storedId) {
            storedId = user.uid;
            localStorage.setItem('userId', storedId);
          }
          this.userId = storedId;
          this.isAdmin = (this.userId === ADMIN_UID);
        } else {
          this.currentUser = null;
          this.userId = '';
          this.isAdmin = false;
        }
        this.cdr.detectChanges();
      });
    });

    // --- Handle redirect from Stripe/MoMo/VNPay ---
    this.ngZone.run(async () => {
      const modal = this.checkoutService.modalInstance;
      if (!modal) return;

      // Kiểm tra localStorage payment_done
      const paymentDone = localStorage.getItem('payment_done');
      const paymentMethod = localStorage.getItem('payment_method');
      const paymentSession = localStorage.getItem('payment_session_id');

      if (paymentDone === 'true' && paymentMethod) {
        modal.showModal = true; // mở modal
        switch (paymentMethod) {
          case 'stripe':
            if (paymentSession) await modal.checkStripePayment(paymentSession);
            break;
          case 'momo':
          case 'vnpay':
            await modal.handlePaymentSuccess();
            break;
        }

        // Clear cart và flags
        this.cartService.clearCart();
        localStorage.removeItem('payment_done');
        localStorage.removeItem('payment_method');
        localStorage.removeItem('payment_session_id');
        localStorage.removeItem('stripeCart');
        localStorage.removeItem('stripeCustomer');

        this.router.navigate([], { queryParams: {} });
        return;
      }

      // fallback nếu query params trực tiếp
      const query = this.route.snapshot.queryParams;
      const sessionId = query['session_id'];
      const resultCode = query['resultCode'];
      const orderId = query['orderId'];

      if (sessionId || (resultCode === '0' && orderId)) {
        modal.showModal = true;
        if (sessionId) {
          await modal.checkStripePayment(sessionId);
        } else if (resultCode === '0' && orderId) {
          await modal.handlePaymentSuccess();
        }
        this.cartService.clearCart();
        this.router.navigate([], { queryParams: {} });
      }
    });
  }

  handleProductOptionSelected(product: Product) {
    this.selectedProductForModal = product;
    this.isModalOpen = true;
    document.body.classList.add('modal-open');
    this.cdr.detectChanges();
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedProductForModal = null;
    document.body.classList.remove('modal-open');
    this.cdr.detectChanges();
  }
}
