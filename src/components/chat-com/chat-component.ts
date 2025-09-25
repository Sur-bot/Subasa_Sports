import { Component, Input, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSupportService } from './chat-support.service';
import { Auth,signInAnonymously, User } from '@angular/fire/auth';

@Component({
  selector: 'ChatComponent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-component.html',
  styleUrls: ['./chat-component.css']
})
export class ChatSupportComponent implements OnInit, AfterViewChecked {
  @Input() userId: string = '';
  messages: any[] = [];
  text = '';
  isOpen = false;

  @ViewChild('bottomRef') bottomRef!: ElementRef;

  constructor(
    private chatService: ChatSupportService,
    private cdr: ChangeDetectorRef,
    private auth: Auth
  ) { }

  ngOnInit() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      this.chatService.registerUser(currentUser.uid, currentUser.email!);
    }

    if (!this.userId) return;

    this.chatService.getMessages(this.userId).subscribe(msgs => {
      this.messages = msgs;
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom() {
    if (this.bottomRef) {
      this.bottomRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async send() {
    if (!this.text.trim()) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.error('Chưa đăng nhập, không gửi được message');
      return;
    }

    try {
      await this.chatService.sendMessage(this.userId, currentUser.uid, this.text, currentUser.email!);
      this.text = '';
      this.cdr.detectChanges();
      this.scrollToBottom();
    } catch (err) {
      console.error('[UserChat] Lỗi khi gửi:', err);
    }
  }

 

async toggleChat() {
  this.isOpen = !this.isOpen;

  if (!this.isOpen) {
    // Đóng chat → clear guest
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = localStorage.getItem('userId');

    if (isGuest && userId) {
      this.chatService.clearUserChat(userId)
        .then(() => {
          console.log('[Chat] Guest chat đã xoá khi tắt box');
          localStorage.removeItem('userId');
          localStorage.removeItem('isGuest');
        })
        .catch(err => console.error('[Chat] Lỗi xoá guest chat:', err));
    }
  } else {
    // Mở chat
    const currentUser = this.auth.currentUser;

    if (currentUser) {
      // Nếu đã đăng nhập thật → dùng UID thật
      this.userId = currentUser.uid;
      localStorage.setItem('userId', currentUser.uid);
      localStorage.removeItem('isGuest');

      await this.chatService.registerUser(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'User'
      );

      console.log('[Chat] Đang dùng tài khoản thật:', this.userId);
    } else {
      // Nếu chưa đăng nhập → fallback guest
      let userId = localStorage.getItem('userId');
      const isGuest = localStorage.getItem('isGuest') === 'true';

      if (isGuest && userId) {
        // Dùng lại guest cũ
        this.userId = userId;
        await this.chatService.registerUser(userId, null, 'Guest');
        console.log('[Chat] Guest đã được register lại:', userId);
      } else {
        // Tạo guest mới qua Firebase Auth
        try {
          const cred = await signInAnonymously(this.auth);
          const user = cred.user;
          this.userId = user.uid;

          localStorage.setItem('userId', user.uid);
          localStorage.setItem('isGuest', 'true');

          await this.chatService.registerUser(user.uid, null, 'Guest');
          console.log('[Chat] Guest mới đã được tạo:', this.userId);
        } catch (err) {
          console.error('[Chat] Lỗi tạo guest:', err);
        }
      }
    }

    setTimeout(() => this.scrollToBottom(), 100);
  }
}




  isSenderMe(senderId: string) {
    return senderId === this.userId;
  }

  formatTime(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
