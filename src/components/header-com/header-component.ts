import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core'; // 1. Thêm Output, EventEmitter
import { CommonModule } from '@angular/common';
import { LoginComponent } from '../login-com/login-component';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { authState } from 'rxfire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { CartComponent } from '../cart-com/cart-component';
import { ChangeDetectorRef } from '@angular/core';
import { CartService } from '../servives/cart.service';

@Component({
  selector: 'header-component',
  standalone: true,
  imports: [CommonModule, LoginComponent, CartComponent],
  templateUrl: './header-component.html',
  styleUrls: ['./header-component.css'],
})
export class HeaderComponent implements OnInit {
  
  // --- THÊM MỚI: Khai báo sự kiện bắn ra ngoài ---
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

private async loadUser() {
  const user = this.auth.currentUser;

  if (!user) {
    this.accountLabel = 'Tài khoản';
    this.isLoggedInEmail = false;
    return;
  }

  if (user.email) {
    this.accountLabel = user.email;
    this.isLoggedInEmail = true;
  } else {
    this.accountLabel = `Guest ${user.uid}`;
    this.isLoggedInEmail = false;
  }

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

  // --- THÊM MỚI: Hàm xử lý khi gõ phím ---
  onSearchInput(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    const keyword = inputElement.value;
    // Gửi từ khóa ra ngoài cho ProductPage nhận
    this.searchChange.emit(keyword);
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
    this.cartService.loadUserCart();
  }

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