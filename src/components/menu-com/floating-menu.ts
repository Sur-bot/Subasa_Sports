import { Component, EventEmitter, Input, Output, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from './UserService';
import { Subscription } from 'rxjs';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ProductFormComponent } from '../product-com/ProductFormComponent';

@Component({
  selector: 'FloatingMenuComponent',
  standalone: true,
  imports: [CommonModule, ProductFormComponent],
  templateUrl: './floating-menu.html',
  styleUrls: ['./floating-menu.css']
})
export class FloatingMenuComponent {
  isOpen = false;
  isSeller = false;
  private sub?: Subscription;

  // modal
  showProductModal = false;
  showEditModal = false;
  loadingProducts = false;   // trạng thái loading

  // dữ liệu sản phẩm
  myProducts: any[] = [];
  selectedProduct: any = null;

  @Input() productList: any[] = [];
  @Output() productChange = new EventEmitter<any>();

  actions = [
    { icon: 'fas fa-plus', label: 'Tạo sản phẩm', onClick: () => this.openProductModal() },
    { icon: 'fas fa-edit', label: 'Điều chỉnh sản phẩm', onClick: () => this.openEditProducts() },
    { icon: 'fas fa-trash', label: 'Xóa sản phẩm', onClick: () => alert('Xóa sản phẩm') },
    { icon: 'fas fa-coins', label: 'Xem doanh thu', onClick: () => alert('Xem doanh thu') }
  ];

  constructor(
    private userService: UserService,
    private firestore: Firestore,
    private auth: Auth,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.sub = this.userService.role$.subscribe((role) => {
      this.isSeller = (role === 'seller');
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

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

  // mở form tạo mới
  openProductModal() {
    this.selectedProduct = null;
    this.showProductModal = true;
    this.isOpen = false;
  }

  closeProductModal() {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  // mở danh sách sản phẩm để chọn
  async openEditProducts() {
  this.isOpen = false;
  this.showEditModal = true;
  this.loadingProducts = true;
  this.myProducts = [];

  this.cdr.markForCheck(); // báo Angular có thay đổi

  const currentUser = this.auth.currentUser;
  if (!currentUser?.email) {
    alert('Bạn cần đăng nhập bằng email để chỉnh sửa sản phẩm.');
    this.loadingProducts = false;
    this.cdr.markForCheck();
    return;
  }

  const productRef = collection(this.firestore, 'products');
  const q = query(productRef, where('ownerEmail', '==', currentUser.email));
  const snap = await getDocs(q);

  this.ngZone.run(() => {
    this.myProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    this.loadingProducts = false;
    this.cdr.markForCheck(); // ép Angular render lại modal
  });
}


  // chọn sản phẩm từ modal
  selectProductForEdit(product: any) {
    this.selectedProduct = product;
    this.showEditModal = false;
    this.showProductModal = true;
  }

  onProductChange(product: any) {
    this.selectedProduct = product;
  }
}
