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

  // --- CỦA BẠN: Biến chứa lịch sử tìm kiếm ---
  recentSearches: string[] = [];

  constructor(
    private router: Router,
    private cartService: CartService // Giữ lại CartService của người kia
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

  // --- CÁC HÀM LOCAL STORAGE (Của bạn) ---
  loadRecentSearches() {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      try {
        this.recentSearches = JSON.parse(history);
      } catch (e) {
        this.recentSearches = [];
      }
    }
  }

  saveToRecentSearches(keyword: string) {
    if (!keyword) return;
    this.recentSearches = this.recentSearches.filter(item => item.toLowerCase() !== keyword.toLowerCase());
    this.recentSearches.unshift(keyword);
    if (this.recentSearches.length > 10) this.recentSearches.pop();
    localStorage.setItem('searchHistory', JSON.stringify(this.recentSearches));
  }

  removeRecentSearch(item: string, event: Event) {
    event.stopPropagation();
    this.recentSearches = this.recentSearches.filter(k => k !== item);
    localStorage.setItem('searchHistory', JSON.stringify(this.recentSearches));
  }

  // --- CÁC HÀM TÌM KIẾM (Của bạn) ---
  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const inputElement = event.target as HTMLInputElement;
      const keyword = inputElement?.value?.trim();
      
      if (keyword) {
        this.saveToRecentSearches(keyword);
        this.router.navigate(['/products'], { queryParams: { search: keyword } });
        this.isOpen = false; 
      }
    }
  }

  onSearchButtonClick() {
    const inputElement = document.querySelector('.input-group') as HTMLInputElement;
    const keyword = inputElement?.value?.trim();
    
    if (keyword) {
      this.saveToRecentSearches(keyword);
      this.router.navigate(['/products'], { queryParams: { search: keyword } });
      this.isOpen = false;
    }
  }

  handleRecentClick(keyword: string) {
    this.saveToRecentSearches(keyword);
    this.router.navigate(['/products'], { queryParams: { search: keyword } });
    this.isOpen = false;
  }

  handleSearchSuggestion(keyword: string) {
    if (keyword) {
      this.router.navigate(['/products'], { queryParams: { category: keyword } });
      this.isOpen = false;
    }
  }

  // --- CÁC HÀM CHUNG ---
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

  // Hàm Login/Logout (Hợp nhất: Có gọi thêm cartService của người kia)
  onLoggedIn(data: { email?: string; guestId?: string }) {
    console.log('[Header] onLoggedIn nhận data:', data);
    this.showLogin = false;
    this.cartService.loadUserCart(); // Gọi CartService
  }

  // 🔴 LOGOUT
  async logout() {
    try {
      await signOut(this.auth);
      console.log('[Logout] thành công');
      localStorage.removeItem('userId'); // Xóa user ID
      this.cartService.loadUserCart();   // Reset giỏ hàng
      this.accountLabel = 'Tài khoản';
      this.isLoggedInEmail = false;
      localStorage.setItem('isGuest', 'true');
      this.router.navigate(['/']);       // Về trang chủ
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
