import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatSupportService {
  constructor(private firestore: Firestore) {}

  // Lấy tin nhắn realtime của user
  getMessages(userId: string): Observable<any[]> {
    const ref = collection(this.firestore, `chats/${userId}/messages`);
    const q = query(ref, orderBy('timestamp', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  // Gửi tin nhắn lên Firestore
  async sendMessage(userId: string, text: string) {
    const ref = collection(this.firestore, `chats/${userId}/messages`);
    await addDoc(ref, {
      sender: userId,
      text,
      timestamp: Date.now()
    });
  }
}
