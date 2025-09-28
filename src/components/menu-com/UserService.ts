import { Injectable } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, onSnapshot } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

const ADMIN_UID = "ucqeK6JbQMViknAiaXDya5iufeE3";

@Injectable({ providedIn: 'root' })
export class UserService {
  private roleSubject = new BehaviorSubject<string | null>(null);
  role$ = this.roleSubject.asObservable();

  constructor(private auth: Auth, private firestore: Firestore) {
    // Lắng nghe login/logout
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        // Nếu UID = ADMIN_UID thì auto gán role = "admin"
        if (user.uid === ADMIN_UID) {
          this.roleSubject.next("admin");
          return; // bỏ qua đọc Firestore
        }

        const ref = doc(this.firestore, `users/${user.uid}`);
        // Lắng nghe realtime document user
        onSnapshot(ref, (snap) => {
          if (snap.exists()) {
            this.roleSubject.next(snap.data()['role'] || null);
          } else {
            this.roleSubject.next(null);
          }
        });
      } else {
        this.roleSubject.next(null);
      }
    });
  }
}
