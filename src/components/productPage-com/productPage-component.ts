import { Component } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';
import { ChatSupportComponent } from '../chat-com/chat-component';
import { AdminDashboardComponent } from '../chat-com/AdminDashboardComponent';
import { NotificationFloatingComponent } from '../notificationfloating-com/notification-floating-component';
import { FloatingMenuComponent } from '../menu-com/floating-menu';
import { RequestSellerComponent } from '../request-seller-com/request-seller';
import { UserService } from '../menu-com/UserService';
import {AdminSellerRequestsComponent} from '../request-seller-com/admin-seller-requests'
///
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
const ADMIN_UID = "ucqeK6JbQMViknAiaXDya5iufeE3";

@Component({
  selector: 'prodcut-component',
  standalone: true,
  imports:[HeaderComponent,
    ChatSupportComponent,
    AdminDashboardComponent,
    NotificationFloatingComponent,
    FloatingMenuComponent,
    RequestSellerComponent,
    AdminSellerRequestsComponent,
    FormsModule,
    CommonModule,
  ],
  templateUrl: './productPage-component.html',
  styleUrl: './productPage-component.css',
})
export class ProducComponent {
  currentUser: User | null = null;
  userId: string = '';
  isAdmin = false;
  showRequestPopup = false;
  role: string | null = null;
  
  constructor(
    private auth: Auth,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private userService: UserService
  ) {
    this.userService.role$.subscribe(r => this.role = r);

  }

  ngOnInit() {
    onAuthStateChanged(this.auth, (user) => {
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
}

