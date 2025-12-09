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
