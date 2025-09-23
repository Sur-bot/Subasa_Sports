import { Component } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-login',
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.css'],
  animations: [
    // Box chính
    trigger('boxAnimation', [
      state('inactive', style({
        transform: 'scale(1)',
        width: '250px',
        height: '120px'
      })),
      state('active', style({
        transform: 'scale(1.1)',
        width: '350px',
        height: '450px'
      })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ]),

    // Title LOGIN
    trigger('titleAnimation', [
      state('inactive', style({
        fontSize: '50px',
        transform: 'translateY(10px)',
      })),
      state('active', style({
        fontSize: '50px',
        transform: 'translateY(0px)',
      })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ]),

    // Form login
    trigger('formAnimation', [
      state('inactive', style({
        opacity: 0,
        transform: 'translateY(30px)',
        display: 'none'
      })),
      state('active', style({
        opacity: 1,
        transform: 'translateY(0)',
        display: 'flex'
      })),
      transition('inactive <=> active', animate('0.4s ease-in-out')),
    ])
  ]
})
export class LoginComponent {
  state: 'active' | 'inactive' = 'inactive';

  activate() {
    this.state = 'active';
  }

  deactivate() {
    this.state = 'inactive';
  }

  onSubmit() {
    alert('Đăng nhập thành công!');
  }
}
