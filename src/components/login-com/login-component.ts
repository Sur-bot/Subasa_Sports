import { Component, EventEmitter, Output, inject } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Auth, signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword, User } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.css'],
  imports: [FormsModule],
  animations: [
    trigger('boxAnimation', [
      state('inactive', style({ transform: 'scale(1)', width: '250px', height: '120px' })),
      state('active', style({ transform: 'scale(1.1)', width: '350px', height: '450px' })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ]),
    trigger('titleAnimation', [
      state('inactive', style({ fontSize: '50px', transform: 'translateY(10px)' })),
      state('active', style({ fontSize: '50px', transform: 'translateY(0px)' })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ]),
    trigger('formAnimation', [
      state('inactive', style({ opacity: 0, transform: 'translateY(30px)', display: 'none' })),
      state('active', style({ opacity: 1, transform: 'translateY(0)', display: 'flex' })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ]),
    // 👇 thêm flip
    trigger('flipAnimation', [
      state('login', style({ transform: 'rotateY(0deg)' })),
      state('register', style({ transform: 'rotateY(180deg)' })),
      transition('login <=> register', animate('0.6s ease-in-out'))
    ])
  ]
})
// ... phần import giữ nguyên

export class LoginComponent {
  @Output() loggedIn = new EventEmitter<{ email?: string; guestId?: string }>();
  @Output() closed = new EventEmitter<void>();

  state: 'active' | 'inactive' = 'inactive';
  mode: 'login' | 'register' = 'login';

  email = '';
  password = '';
  confirmPassword = '';   // 👈 thêm confirm pass
  firstName = '';
  lastName = '';

  private auth = inject(Auth);
  private firestore = inject(Firestore);

  activate() { this.state = 'active'; }
  deactivate() { this.state = 'inactive'; }

  // ===== LOGIN =====
  onSubmit() {
    if (!this.email || !this.password) {
      alert('Vui lòng nhập đầy đủ email và password!');
      return;
    }

    signInWithEmailAndPassword(this.auth, this.email, this.password)
      .then(cred => {
        const user: User = cred.user;

        localStorage.removeItem('isGuest');
        localStorage.setItem('userId', user.uid);

        console.log('[Login] Thành công:', user.uid);
        this.loggedIn.emit({ email: user.email || this.email });
      })
      .catch(() => {
        alert('Email hoặc password không đúng!');
      });
  }

  loginAsGuest() {
    signInAnonymously(this.auth)
      .then(cred => {
        const user: User = cred.user;
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('isGuest', 'true');

        console.log('[Guest] Thành công:', user.uid);
        this.loggedIn.emit({ guestId: user.uid });
      })
      .catch(() => {
        alert('Không thể login guest!');
      });
  }

  // ===== REGISTER =====
    // ===== REGISTER =====
  async onRegister() {
    if (!this.email || !this.password || !this.firstName || !this.lastName || !this.confirmPassword) {
      alert('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
      const user: User = cred.user;

      // lưu thông tin mở rộng vào Firestore
      await setDoc(doc(this.firestore, 'users', user.uid), {
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        role: 'user',
        createdAt: new Date()
      });

      console.log('[Register] Thành công:', user.uid);
      this.loggedIn.emit({ email: user.email || this.email });

      this.mode = 'login'; // quay lại login sau khi register
    } catch (err: any) {
      console.error('Lỗi khi đăng ký:', err);

      // bắt lỗi cụ thể từ Firebase
      if (err.code === 'auth/email-already-in-use') {
        alert('Email này đã được sử dụng, vui lòng chọn email khác!');
      } else if (err.code === 'auth/invalid-email') {
        alert('Địa chỉ email không hợp lệ!');
      } else if (err.code === 'auth/weak-password') {
        alert('Mật khẩu quá yếu, hãy chọn mật khẩu mạnh hơn (tối thiểu 6 ký tự).');
      } else {
        alert('Đăng ký thất bại! Vui lòng thử lại.');
      }
    }
  }


  closeLogin() {
    this.closed.emit();
  }

  toggleMode(event?: Event) {
    if (event) {
      event.preventDefault(); // chặn reload khi click <a>
    }
    this.mode = this.mode === 'login' ? 'register' : 'login';
  }
}
