import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, collectionData, doc, setDoc, deleteDoc, getDocs } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatSupportService {
  constructor(private firestore: Firestore) { }

  // Lấy messages trong 1 user chat (đã kèm senderEmail trong mỗi message)
  getMessages(userId: string): Observable<any[]> {
    const ref = collection(this.firestore, 'chats', userId, 'messages');
    const q = query(ref, orderBy('timestamp', 'asc'));
    console.log('[ChatService] Lấy messages cho userId:', userId);

    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  // Gửi message
  async sendMessage(userId: string, senderId: string, text: string, senderEmail: string, isGuest = false) {
    const finalEmail = isGuest ? `guest-${senderId}@chat.local` : senderEmail;

    console.log('[ChatService] Chuẩn bị gửi:', { userId, senderId, text, finalEmail });

    const userRef = doc(this.firestore, 'chats', userId);


    await setDoc(userRef, {
      userId,
      lastMessage: text,
      updatedAt: Date.now(),
      expireAt: isGuest ? new Date(Date.now() + 60 * 60 * 1000) : null
    }, { merge: true });

    // Thêm message (luôn có email của sender)
    const ref = collection(this.firestore, 'chats', userId, 'messages');
    try {
      const docRef = await addDoc(ref, {
        sender: senderId,
        senderEmail: finalEmail,  // email của sender (guest hoặc thật)
        text,
        timestamp: Date.now()
      });
      console.log('[ChatService] Đã thêm message ID:', docRef.id);
    } catch (err) {
      console.error('[ChatService] Lỗi khi addDoc:', err);
      throw err;
    }
  }

  // Lấy danh sách user đang chat
  getActiveUsers(): Observable<any[]> {
    const ref = collection(this.firestore, 'chats');
    console.log('[ChatService] Lấy danh sách user đang chat');
    return collectionData(ref, { idField: 'userId' }) as Observable<any[]>;
  }

  async registerUser(userId: string, email: string | null, displayName?: string, isGuest = false) {
    const userRef = doc(this.firestore, 'chats', userId);
    await setDoc(userRef, {
      userId,
      email, // với guest thì null
      displayName: displayName ?? (email ? email.split('@')[0] : 'Guest'),
      isGuest,                       // <--- flag phân biệt
      lastActive: Date.now(),
      expireAt: isGuest
        ? new Date(Date.now() + 60 * 60 * 1000) // TTL 1 tiếng
        : null
    }, { merge: true });

    console.log('[ChatService] Đã lưu user vào chats:', { userId, email, isGuest });
  }



  // Xóa toàn bộ messages + user info
  async clearUserChat(userId: string) {
    const userRef = doc(this.firestore, 'chats', userId);

    // Xóa messages con
    const messagesRef = collection(this.firestore, 'chats', userId, 'messages');
    const snap = await getDocs(messagesRef);
    for (const m of snap.docs) {
      await deleteDoc(m.ref);
    }

    // Xóa document user chính
    await deleteDoc(userRef);

    console.log('[ChatService] Đã xóa toàn bộ chat của:', userId);
  }
}
