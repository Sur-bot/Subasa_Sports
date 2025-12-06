import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
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
  
  @Output() searchChange = new EventEmitter<string>();

  isOpen = false;
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  accountLabel = 'Tài khoản';
  isLoggedInEmail = false;
  showLogin = false;
  openCategory: string | null = null;

  // --- 1. BIẾN CHỨA LỊCH SỬ TÌM KIẾM ---
  recentSearches: string[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    // --- 2. LOAD LỊCH SỬ KHI VÀO WEB ---
    this.loadRecentSearches();

    authState(this.auth).subscribe(async (user) => {
      // (Code Auth cũ giữ nguyên)
      if (user) {
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

  // --- HÀM QUẢN LÝ LOCAL STORAGE ---
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
    
    // 1. Xóa từ khóa cũ nếu trùng (để đưa lên đầu)
    this.recentSearches = this.recentSearches.filter(item => item.toLowerCase() !== keyword.toLowerCase());
    
    // 2. Thêm vào đầu mảng
    this.recentSearches.unshift(keyword);
    
    // 3. Giới hạn 10 phần tử (First In First Out thực tế là cái mới nhất ở đầu, cái cũ nhất ở cuối bị đẩy ra)
    if (this.recentSearches.length > 10) {
      this.recentSearches.pop();
    }

    // 4. Lưu vào máy
    localStorage.setItem('searchHistory', JSON.stringify(this.recentSearches));
  }

  // Xóa 1 từ khóa khỏi lịch sử
  removeRecentSearch(item: string, event: Event) {
    event.stopPropagation(); // Chặn sự kiện click lan ra ngoài
    this.recentSearches = this.recentSearches.filter(k => k !== item);
    localStorage.setItem('searchHistory', JSON.stringify(this.recentSearches));
  }

  // --- CẬP NHẬT CÁC HÀM TÌM KIẾM ---

  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const inputElement = event.target as HTMLInputElement;
      const keyword = inputElement?.value?.trim();
      
      if (keyword) {
        this.saveToRecentSearches(keyword); // <--- LƯU LỊCH SỬ
        this.router.navigate(['/products'], { queryParams: { search: keyword } });
        this.isOpen = false; 
      }
    }
  }

  onSearchButtonClick() {
    const inputElement = document.querySelector('.input-group') as HTMLInputElement;
    const keyword = inputElement?.value?.trim();
    
    if (keyword) {
      this.saveToRecentSearches(keyword); // <--- LƯU LỊCH SỬ
      this.router.navigate(['/products'], { queryParams: { search: keyword } });
      this.isOpen = false;
    }
  }

  // Bấm vào danh sách lịch sử -> Tìm kiếm lại
  handleRecentClick(keyword: string) {
    this.saveToRecentSearches(keyword); // Đưa lên đầu lại
    this.router.navigate(['/products'], { queryParams: { search: keyword } });
    this.isOpen = false;
  }

  // Bấm vào gợi ý có sẵn (Giày chạy, bóng đá...) -> Tùy bạn có muốn lưu không
  handleSearchSuggestion(keyword: string) {
    if (keyword) {
      // this.saveToRecentSearches(keyword); // Bỏ comment nếu muốn lưu cả cái này
      this.router.navigate(['/products'], { queryParams: { category: keyword } }); // Chú ý: dùng 'category' theo logic trước
      this.isOpen = false;
    }
  }

  // --- CÁC HÀM KHÁC GIỮ NGUYÊN ---
  toggleSidebar() { this.isOpen = !this.isOpen; }
  toggleCategory(category: string) { this.openCategory = this.openCategory === category ? null : category; }
  toggleLogin() { if (!this.isLoggedInEmail) this.showLogin = !this.showLogin; }
  closeLogin() { this.showLogin = false; }
  onLoggedIn(data: any) { this.showLogin = false; }
  closeOnOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('overlay')) this.closeLogin();
  }
  async logout() {
    try { await signOut(this.auth); this.accountLabel = 'Tài khoản'; this.isLoggedInEmail = false; localStorage.setItem('isGuest', 'true'); window.location.reload(); } catch (e) {}
  }
}