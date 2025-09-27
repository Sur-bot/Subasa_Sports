import { Component, Input } from '@angular/core';
import { Firestore, collection, query, where, getDocs, updateDoc, doc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-seller-requests',
  standalone: true,
  templateUrl: './admin-seller-requests.html',
  styleUrls: ['./admin-seller-requests.css'],
  imports: [CommonModule]
})
export class AdminSellerRequestsComponent {
  @Input() role: string | null = null;

  isOpen = false;
  requests: any[] = [];
  selectedRequest: any = null;

  constructor(private firestore: Firestore) {}

  async togglePopup() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      await this.loadRequests();
    }
  }

  async loadRequests() {
    const q = query(collection(this.firestore, 'sellerRequests'), where('status', '==', 'pending'));
    const snap = await getDocs(q);
    this.requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  selectRequest(req: any) {
    this.selectedRequest = req;
  }

  async approve(req: any) {
  const userRef = doc(this.firestore, 'users', req.uid);
  await updateDoc(userRef, { role: 'seller' });

  const reqRef = doc(this.firestore, 'sellerRequests', req.id);
  await updateDoc(reqRef, { status: 'approved' });

  await this.loadRequests();
  this.selectedRequest = null; // reset để quay về list
}

async reject(req: any) {
  const reqRef = doc(this.firestore, 'sellerRequests', req.id);
  await updateDoc(reqRef, { status: 'rejected' });

  await this.loadRequests();
  this.selectedRequest = null; // reset để quay về list
}

}
