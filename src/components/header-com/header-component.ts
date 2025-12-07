import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from '../login-com/login-component';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { authState } from 'rxfire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CartComponent } from '../cart-com/cart-component';
import { CartService } from '../servives/cart.service';

@Component({
  selector: 'header-component',
  standalone: true,
  imports: [CommonModule,LoginComponent ,CartComponent],
  templateUrl: './header-component.html',
  styleUrls: ['./header-component.css'],
})
export class HeaderComponent implements OnInit {
  @Output() searchChange = new EventEmitter<string>();

  isOpen = false;
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  accountLabel = 'Tài khoản';
  isLoggedInEmail = false;
  showLogin = false;
  openCategory: string | null = null;

  constructor(
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.loadUser();

    this.router.events.subscribe(() => {
      this.loadUser();
    });

    authState(this.auth).subscribe(() => {
      this.loadUser();
    });
  }

  // 📌 LẤY THÔNG TIN USER
  private async loadUser() {
    const user = this.auth.currentUser;

    if (!user) {
      this.accountLabel = 'Tài khoản';
      this.isLoggedInEmail = false;
      return;
    }

    this.isLoggedInEmail = !!user.email;
    this.accountLabel = user.email ?? `Guest ${user.uid}`;

    // 🔎 Lấy thêm email ở Firestore (nếu có)
    try {
      const snap = await getDoc(doc(this.firestore, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        this.accountLabel = data['email'] ?? this.accountLabel;
      }
    } catch (e) {
      console.error('[Header] Firestore error:', e);
    }
  }

  // 🔍 SEARCH
  onSearchInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const keyword = inputElement.value;
    this.searchChange.emit(keyword);
  }

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  toggleCategory(category: string) {
    this.openCategory = this.openCategory === category ? null : category;
  }

  // 🚫 Popup chỉ mở nếu chưa đăng nhập
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
    this.cartService.loadUserCart();
  }

  // 🔴 LOGOUT
  async logout() {
    try {
      await signOut(this.auth);
      console.log('[Logout] thành công');
      localStorage.removeItem('userId');
      this.cartService.loadUserCart();
      this.accountLabel = 'Tài khoản';
      this.isLoggedInEmail = false;
      localStorage.setItem('isGuest', 'true');
      this.router.navigate(['/']);
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
