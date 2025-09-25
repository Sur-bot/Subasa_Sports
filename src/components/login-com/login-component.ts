import { Component } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Auth, signInWithEmailAndPassword, signInAnonymously, User } from '@angular/fire/auth';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.css'],
  imports: [FormsModule],
  animations: [
    // Box chính
    trigger('boxAnimation', [
      state('inactive', style({ transform: 'scale(1)', width: '250px', height: '120px' })),
      state('active', style({ transform: 'scale(1.1)', width: '350px', height: '450px' })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ]),
    // Title LOGIN
    trigger('titleAnimation', [
      state('inactive', style({ fontSize: '50px', transform: 'translateY(10px)' })),
      state('active', style({ fontSize: '50px', transform: 'translateY(0px)' })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ]),
    // Form login
    trigger('formAnimation', [
      state('inactive', style({ opacity: 0, transform: 'translateY(30px)', display: 'none' })),
      state('active', style({ opacity: 1, transform: 'translateY(0)', display: 'flex' })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ])
  ]
})
export class LoginComponent {
  state: 'active' | 'inactive' = 'inactive';

  email = '';
  password = '';

  private auth = inject(Auth);
  private router = inject(Router);

  activate() { this.state = 'active'; }
  deactivate() { this.state = 'inactive'; }

  //  Login bằng email/password
  onSubmit() {
    if (!this.email || !this.password) {
      alert('Vui lòng nhập đầy đủ email và password!');
      return;
    }

    signInWithEmailAndPassword(this.auth, this.email, this.password)
      .then(cred => {
        const user: User = cred.user;

        // Clear session guest cũ (nếu có)
        localStorage.removeItem('isGuest');
        localStorage.removeItem('userId');

        // Lưu UID thật
        localStorage.setItem('userId', user.uid);

        console.log('[Login] Đăng nhập thành công:', user.uid);

        this.router.navigate(['/home']);
      })
      .catch(err => {
        console.error('Login failed', err);
        alert('Email hoặc password không đúng!');
      });

  }

  //  Login Guest 
  loginAsGuest() {
    signInAnonymously(this.auth)
      .then(cred => {
        const user: User = cred.user;

        // Lưu UID của anonymous user vào localStorage
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('isGuest', 'true');

        console.log('[Guest] login success:', user.uid);

        this.router.navigate(['/home']);
      })
      .catch(err => {
        console.error('[Guest] Login failed:', err);
        alert('Không thể login guest!');
      });
  }
}
