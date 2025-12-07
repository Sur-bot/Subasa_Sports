import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';

import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


//components
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
import {AdminSellerRequestsComponent} from '../request-seller-com/admin-seller-requests'
import { BrandSliderComponent } from '../brand-com/brand-component';
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
    CommonModule
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  userId: string = '';
  isAdmin = false;
  showRequestPopup = false;
  role: string | null = null;
  
  constructor(
    private auth: Auth,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private router: Router
  ) {
    this.userService.role$.subscribe(r => this.role = r);

  }
  
  ngOnInit() {
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

          console.log('Render check:', this.userId, this.isAdmin);
        } else {
          this.currentUser = null;
          this.userId = '';
          this.isAdmin = false;
          console.log('Render check:', this.userId, this.isAdmin);
        }

        // ép Angular render lại
        this.cdr.detectChanges();
      });
    });
  }
    // Modal logic
    selectedProductForModal: Product | null = null;
    isModalOpen: boolean = false; 
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
