import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from './UserService';
import { Subscription } from 'rxjs';
import { ProductComponent } from '../product-com/product-component';

@Component({
  selector: 'FloatingMenuComponent',
  standalone: true,
  imports: [CommonModule, ProductComponent],
  templateUrl: './floating-menu.html',
  styleUrls: ['./floating-menu.css']
})
export class FloatingMenuComponent {
  isOpen = false;
  isSeller = false;
  private sub?: Subscription;

  // trạng thái mở modal sản phẩm
  showProductModal = false;

  actions = [
    { icon: 'fas fa-plus', label: 'Tạo sản phẩm', onClick: () => this.openProductModal() },
    { icon: 'fas fa-edit', label: 'Điều chỉnh sản phẩm', onClick: () => alert('Điều chỉnh sản phẩm') },
    { icon: 'fas fa-trash', label: 'Xóa sản phẩm', onClick: () => alert('Xóa sản phẩm') },
    { icon: 'fas fa-coins', label: 'Xem doanh thu', onClick: () => alert('Xem doanh thu') }
  ];

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  getButtonStyle(index: number) {
    const distance = 80;
    return {
      transform: this.isOpen
        ? `translate(${-distance * (index + 1)}px, 0)`
        : 'translate(0,0)',
      transitionDelay: `${index * 0.1}s`
    };
  }

  openProductModal() {
    this.showProductModal = true;
    this.isOpen = false; // đóng menu sau khi click
  }

  closeProductModal() {
    this.showProductModal = false;
  }

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.sub = this.userService.role$.subscribe((role) => {
      this.isSeller = (role === 'seller');
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
