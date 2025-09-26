import { Component, Input, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSupportService } from './chat-support.service';
import { Auth, signInAnonymously, User, deleteUser } from '@angular/fire/auth';

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
    // 🔑 Luôn sync userId với Firebase UID
    this.userId = currentUser.uid;
    localStorage.setItem('userId', this.userId);
    if (!currentUser.isAnonymous) {
      localStorage.removeItem('isGuest');
    }

    this.chatService.registerUser(
      this.userId,
      currentUser.email,
      currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'User'
    );

    // Luôn subscribe theo UID thực
    this.chatService.getMessages(this.userId).subscribe(msgs => {
      this.messages = msgs;
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
  }
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

  const userId = currentUser.uid; // 🔑 không lấy từ localStorage
  try {
    await this.chatService.sendMessage(
      userId,
      userId,
      this.text,
      currentUser.email || ''
    );
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
    // Đóng chat → clear guest ngay
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const userId = localStorage.getItem('userId');

    if (isGuest && userId) {
      // Xoá localStorage ngay lập tức để đảm bảo đóng là mất
      localStorage.removeItem('userId');
      localStorage.removeItem('isGuest');

      try {
        // Xoá dữ liệu chat
        await this.chatService.clearUserChat(userId);
        console.log('[Chat] Guest chat đã xoá khi tắt box');

        // Xoá guest account trong Firebase Auth nếu còn tồn tại
        if (this.auth.currentUser?.isAnonymous && this.auth.currentUser.uid === userId) {
          try {
            const user = this.auth.currentUser as User;
            await deleteUser(user);
            console.log('[Chat] Guest account đã bị xoá khỏi Firebase Auth');
          } catch (err) {
            console.error('[Chat] Lỗi xoá guest account:', err);
          }
        }
      } catch (err) {
        console.error('[Chat] Lỗi xoá guest chat:', err);
      }
    }
  } else {
    // Mở chat
    const currentUser = this.auth.currentUser;

    if (currentUser) {
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
      let userId = localStorage.getItem('userId');
      const isGuest = localStorage.getItem('isGuest') === 'true';

      if (isGuest && userId) {
        this.userId = userId;
        await this.chatService.registerUser(userId, null, 'Guest');
        console.log('[Chat] Guest đã được register lại:', userId);
      } else {
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
