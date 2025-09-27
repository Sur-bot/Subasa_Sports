
import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, query, CollectionReference } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
// Import interface đã tạo


export interface Feature {
    id?: string; // Thêm id để dễ dàng nhận diện tài liệu
    link: string;
    name: string;
    
}
@Injectable({
  providedIn: 'root'
})
export class NotificationFloatingService {
  private featuresCollection: CollectionReference<Feature>;

  constructor(private firestore: Firestore) {
    // 1. Chỉ định collection cần truy cập ('notification')
    this.featuresCollection = collection(this.firestore, 'notification') as CollectionReference<Feature>;
  }

  // 2. Hàm lấy tất cả các tài liệu (documents) trong collection
  getFeatures(): Observable<Feature[]> {
    const q = query(this.featuresCollection);
    
    // collectionData map các documents thành mảng các objects Feature
    return collectionData(q, { idField: 'id' });
  }
}