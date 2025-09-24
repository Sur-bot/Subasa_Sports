import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, collectionData, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatSupportService {
  constructor(private firestore: Firestore) {}

  // 🔹 Lấy messages trong 1 user chat (đã kèm senderEmail trong mỗi message)
  getMessages(userId: string): Observable<any[]> {
    const ref = collection(this.firestore, 'chats', userId, 'messages');
    const q = query(ref, orderBy('timestamp', 'asc'));
    console.log('[ChatService] Lấy messages cho userId:', userId);

    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  // 🔹 Gửi message
  async sendMessage(userId: string, senderId: string, text: string, senderEmail: string) {
    console.log('[ChatService] Chuẩn bị gửi:', { userId, senderId, text, senderEmail });

    const userRef = doc(this.firestore, 'chats', userId);

    // ⚡ Không ghi đè email user, chỉ update metadata
    await setDoc(userRef, {
      userId,
      lastMessage: text,
      updatedAt: Date.now()
    }, { merge: true });

    // Thêm message (luôn có email của sender)
    const ref = collection(this.firestore, 'chats', userId, 'messages');
    try {
      const docRef = await addDoc(ref, {
        sender: senderId,
        senderEmail,  // 👈 email của sender
        text,
        timestamp: Date.now()
      });
      console.log('[ChatService] Đã thêm message ID:', docRef.id);
    } catch (err) {
      console.error('[ChatService] Lỗi khi addDoc:', err);
      throw err;
    }
  }

  // 🔹 Lấy danh sách user đang chat
  getActiveUsers(): Observable<any[]> {
    const ref = collection(this.firestore, 'chats');
    console.log('[ChatService] Lấy danh sách user đang chat');
    return collectionData(ref, { idField: 'userId' }) as Observable<any[]>;
  }

  // 🔹 Đăng ký user khi bắt đầu chat
  async registerUser(userId: string, email: string, displayName?: string) {
    const userRef = doc(this.firestore, 'chats', userId);
    await setDoc(userRef, {
      userId,
      email,
      displayName: displayName ?? email.split('@')[0],
      lastActive: Date.now()
    }, { merge: true });

    console.log('[ChatService] Đã lưu user vào chats:', { userId, email });
  }
}
