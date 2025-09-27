import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  CollectionReference,
  getDoc,doc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Feature {
  id?: string;
  link: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationFloatingService {
  private featuresCollection: CollectionReference<Feature>;

  constructor(private firestore: Firestore) {
    this.featuresCollection = collection(
      this.firestore,
      'notification'
    ) as CollectionReference<Feature>;
  }

  getFeatures(): Observable<Feature[]> {
    const q = query(this.featuresCollection);
    return collectionData(q, { idField: 'id' });
  }

}
