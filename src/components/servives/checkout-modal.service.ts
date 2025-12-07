import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';

@Injectable({ providedIn: 'root' })
export class CheckoutModalService {
  private modalInstanceSubject = new BehaviorSubject<CheckoutModalComponent | null>(null);
  modalInstance$ = this.modalInstanceSubject.asObservable();

  setModalInstance(modal: CheckoutModalComponent | null) {
    this.modalInstanceSubject.next(modal);
  }

  getModalInstance() {
    return this.modalInstanceSubject.value;
  }
}
