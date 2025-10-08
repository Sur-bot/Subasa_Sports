import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from '../login-com/login-component';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { authState } from 'rxfire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CartComponent } from '../cart-com/cart-component';

@Component({
  selector: 'header-component',
  standalone: true,
  imports: [CommonModule, LoginComponent, CartComponent],
  templateUrl: './header-component.html',
  styleUrls: ['./header-component.css'],
 
})
export class HeaderComponent implements OnInit {
  isOpen = false;
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  accountLabel = 'Tài khoản';
  isLoggedInEmail = false;
  showLogin = false;
  openCategory: string | null = null;

  constructor(private router: Router) {}

  ngOnInit() {
    // Dùng authState (Observable) → không bị mất user khi đổi routes
    authState(this.auth).subscribe(async (user) => {
      console.log('[Header] authState user:', user);

      if (user) {
        if (user.email) {
          // Login bằng email
          this.accountLabel = user.email;
          this.isLoggedInEmail = true;
        } else {
          // Guest
          this.accountLabel = `Guest ${user.uid}`;
          this.isLoggedInEmail = false;
        }

        // 🔹 Nếu bạn muốn lấy thêm dữ liệu từ Firestore (VD: firstName + lastName)
        try {
          const snap = await getDoc(doc(this.firestore, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data['firstName'] && data['lastName']) {
              this.accountLabel = `${data['email']}`;
            }
          }
        } catch (e) {
          console.error('[Header] Lỗi khi đọc Firestore:', e);
        }
      } else {
        this.accountLabel = 'Tài khoản';
        this.isLoggedInEmail = false;
      }
    });
  }

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  toggleCategory(category: string) {
    this.openCategory = this.openCategory === category ? null : category;
  }

  toggleLogin() {
    if (!this.isLoggedInEmail) {
      this.showLogin = !this.showLogin;
    }
  }

  closeLogin() {
    this.showLogin = false;
  }

  onLoggedIn(data: { email?: string; guestId?: string }) {
    console.log('[Header] onLoggedIn nhận data:', data);
    this.showLogin = false;
    // Không cần set label thủ công nữa vì authState sẽ tự cập nhật
  }

  async logout() {
    try {
      await signOut(this.auth);
      console.log('[Logout] thành công');
      this.accountLabel = 'Tài khoản';
      this.isLoggedInEmail = false;
    } catch (e) {
      console.error('Lỗi khi logout:', e);
    }
  }

  closeOnOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('overlay')) {
      this.closeLogin();
    }
  }
}
