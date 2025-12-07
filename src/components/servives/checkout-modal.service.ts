import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CheckoutModalComponent } from '../checkout-modal/checkout-modal.component';

@Injectable({
  providedIn: 'root'
})
export class CheckoutModalService {
  // instance của CheckoutModalComponent hiện tại
  public modalInstance: CheckoutModalComponent | null = null;

  // observable để các component khác có thể subscribe (nếu cần)
  private _modalState$ = new BehaviorSubject<boolean>(false);
  public modalState$ = this._modalState$.asObservable();

  constructor() {}

  // Đăng ký instance của modal
  setModalInstance(instance: CheckoutModalComponent) {
    this.modalInstance = instance;
  }

  // Bật modal
  openModal() {
    if (this.modalInstance) {
      this.modalInstance.showModal = true;
      this._modalState$.next(true);
    }
  }

  // Đóng modal
  closeModal() {
    if (this.modalInstance) {
      this.modalInstance.showModal = false;
      this._modalState$.next(false);
    }
  }

  // Toggle modal
  toggleModal() {
    if (this.modalInstance) {
      this.modalInstance.showModal = !this.modalInstance.showModal;
      this._modalState$.next(this.modalInstance.showModal);
    }
  }

  // Kiểm tra modal đang mở không
  isOpen(): boolean {
    return this.modalInstance ? this.modalInstance.showModal : false;
  }
}
