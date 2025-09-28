import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from '../login-com/login-component';
import { Router } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { inject } from '@angular/core';

@Component({
  selector: 'header-component',
  standalone: true,
  imports: [CommonModule, LoginComponent],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {
  isOpen = false;
  private auth = inject(Auth);

  accountLabel = 'Tài khoản';
  isLoggedInEmail = false;
  showLogin = false;

  constructor(private router: Router) {}

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  toggleCategory(category: string) {
    this.openCategory = this.openCategory === category ? null : category;
  }

  openCategory: string | null = null;

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

    if (data.email) {
      this.accountLabel = data.email;
      this.isLoggedInEmail = true; // set flag true khi login email
    } else if (data.guestId) {
      this.accountLabel = `Guest ${data.guestId}`;
      this.isLoggedInEmail = false;
    }
    this.showLogin = false;
  }

  async logout() {
    try {
      await signOut(this.auth);
      console.log('[Logout] thành công');
      this.accountLabel = 'Tài khoản'; // reset về mặc định
      this.isLoggedInEmail = false;
      localStorage.removeItem('userId');
      localStorage.removeItem('isGuest');
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
