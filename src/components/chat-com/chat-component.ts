import { Component, Input, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSupportService } from './chat-support.service';
import { Auth } from '@angular/fire/auth';

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
  ) {}

  ngOnInit() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      // ✅ đăng ký user với email ngay khi component mount
      this.chatService.registerUser(
        currentUser.uid,
        currentUser.email!
      );
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
      await this.chatService.sendMessage(
        this.userId,
        currentUser.uid,
        this.text,
        currentUser.email!
      );
      this.text = '';
      this.cdr.detectChanges();
      this.scrollToBottom();
    } catch (err) {
      console.error('[UserChat] Lỗi khi gửi:', err);
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100); // 🔹 scroll khi bật box chat
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
