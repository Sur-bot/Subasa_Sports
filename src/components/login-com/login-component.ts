import { Component, EventEmitter, Output } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Auth, signInWithEmailAndPassword, signInAnonymously, User } from '@angular/fire/auth';
import { inject } from '@angular/core';
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
    ])
  ]
})
export class LoginComponent {
  @Output() loggedIn = new EventEmitter<{ email?: string; guestId?: string }>();
  @Output() closed = new EventEmitter<void>();

  state: 'active' | 'inactive' = 'inactive';
  email = '';
  password = '';

  private auth = inject(Auth);

  activate() { this.state = 'active'; }
  deactivate() { this.state = 'inactive'; }

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
        console.log('[LoginComponent] emit loggedIn với useremail:', user.email);
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
        console.log('[LoginComponent] emit loggedIn với guestId:', user.uid);
      })
      .catch(() => {
        alert('Không thể login guest!');
      });
  }
  closeLogin() {
    this.closed.emit(); // báo cho HeaderComponent
  }
}
