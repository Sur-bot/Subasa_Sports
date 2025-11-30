import { Injectable } from '@angular/core';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  public currentUser$ = new BehaviorSubject<User | null>(null);

  constructor(private auth: Auth) {
    onAuthStateChanged(this.auth, user => {
      console.log('[AuthService] user changed:', user);
      this.currentUser$.next(user);
    });
  }

  get currentUser() {
    return this.currentUser$.value;
  }
}
