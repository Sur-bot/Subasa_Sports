import { Component, ChangeDetectorRef } from '@angular/core';
import { Firestore, collection, query, where, getDocs, updateDoc, doc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-seller-requests.html',
  styleUrls: ['./admin-seller-requests.css'],
  imports: [CommonModule]
})
export class AdminSellerRequestsComponent {
  isOpen = false;
  activeTab: 'seller' | 'product' = 'seller';

  // seller requests
  requests: any[] = [];
  selectedRequest: any = null;

  // products
  products: any[] = [];
  selectedProduct: any = null;

  // preview
  previewUrl: string | null = null;

  constructor(private firestore: Firestore, private cdr: ChangeDetectorRef) {}

  async togglePopup() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      await this.loadSellerRequests();
      await this.loadProducts();
    }
  }

  /** SELLER REQUESTS */
  async loadSellerRequests() {
    const q = query(collection(this.firestore, 'sellerRequests'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    this.requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.cdr.detectChanges();
  }

  selectRequest(req: any) {
    this.selectedRequest = req;
    this.selectedProduct = null;
  }

  async approveSeller(req: any) {
    const userRef = doc(this.firestore, 'users', req.uid);
    await updateDoc(userRef, { role: 'seller' });

    const reqRef = doc(this.firestore, 'sellerRequests', req.id);
    await updateDoc(reqRef, { status: 'approved' });

    await this.loadSellerRequests();
    this.selectedRequest = null;
  }

  async rejectSeller(req: any) {
    const reqRef = doc(this.firestore, 'sellerRequests', req.id);
    await updateDoc(reqRef, { status: 'rejected' });

    await this.loadSellerRequests();
    this.selectedRequest = null;
  }

  /** PRODUCTS */
  async loadProducts() {
    const q = query(collection(this.firestore, 'products'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    this.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    this.cdr.detectChanges();
  }

  selectProduct(prod: any) {
    this.selectedProduct = prod;
    this.selectedRequest = null;
  }

  async approveProduct(prod: any) {
    const prodRef = doc(this.firestore, 'products', prod.id);
    await updateDoc(prodRef, { status: 'approved' });

    await this.loadProducts();
    this.selectedProduct = null;
    this.cdr.detectChanges();
  }

  async rejectProduct(prod: any) {
    const prodRef = doc(this.firestore, 'products', prod.id);
    await updateDoc(prodRef, { status: 'rejected' });

    await this.loadProducts();
    this.selectedProduct = null;
    this.cdr.detectChanges();
  }

  /** COMMON */
  previewImage(url: string) {
    this.previewUrl = url;
  }

  closePreview() {
    this.previewUrl = null;
  }
}
