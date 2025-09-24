import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, setDoc, doc, serverTimestamp, query, orderBy, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatSupportService {
  constructor(private firestore: Firestore) {}

  getMessages(userId: string): Observable<any[]> {
    const ref = collection(this.firestore, 'chats', userId, 'messages');
    const q = query(ref, orderBy('timestamp', 'asc'));
    console.log('[ChatService] Lấy messages cho userId:', userId);
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  async sendMessage(userId: string, senderId: string, text: string) {
    console.log('[ChatService] Chuẩn bị gửi:', { userId, senderId, text });

    // Đảm bảo mỗi user chat có thông tin email
    const userRef = doc(this.firestore, 'chats', userId);
    await setDoc(userRef, { userId }, { merge: true });

    const ref = collection(this.firestore, 'chats', userId, 'messages');
    try {
      const docRef = await addDoc(ref, {
        sender: senderId,
        text,
        timestamp: Date.now()
      });
      console.log('[ChatService] Đã thêm doc ID:', docRef.id);
    } catch (err) {
      console.error('[ChatService] Lỗi khi addDoc:', err);
      throw err;
    }
  }

  getActiveUsers(): Observable<any[]> {
    const ref = collection(this.firestore, 'chats');
    console.log('[ChatService] Lấy danh sách user đang chat');
    return collectionData(ref, { idField: 'userId' }) as Observable<any[]>;
  }
}
