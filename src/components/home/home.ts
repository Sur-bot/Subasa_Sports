import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';
import { BannerComponent } from '../banner-com/banner-component';
import { ChatSupportComponent } from '../chat-com/chat-component';
import { AdminDashboardComponent } from '../chat-com/AdminDashboardComponent';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NotificationFloatingComponent } from '../notificationfloating-com/notification-floating-component';
const ADMIN_UID = "ucqeK6JbQMViknAiaXDya5iufeE3";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    BannerComponent,
    HeaderComponent,
    ChatSupportComponent,
    AdminDashboardComponent,
    NotificationFloatingComponent,
    FormsModule,
    CommonModule
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  userId: string = '';
  isAdmin = false;

  constructor(
    private auth: Auth,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

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
