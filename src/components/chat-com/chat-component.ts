import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSupportService } from './chat-support.service';

@Component({
  selector: 'ChatComponent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-component.html',
  styleUrls: ['./chat-component.css']
})
export class ChatSupportComponent implements OnInit {
  @Input() userId: string = '';
  messages: any[] = [];
  text = '';
  isOpen = false;

  constructor(
    private chatService: ChatSupportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.userId) return;

    // 🔹 Sử dụng getMessages thay cho listenMessages
    this.chatService.getMessages(this.userId).subscribe(msgs => {
      this.messages = msgs;
      this.cdr.detectChanges();
    });
  }

  async send() {
    if (!this.text.trim()) return;
    try {
      await this.chatService.sendMessage(this.userId, this.userId, this.text);
      this.text = '';
      this.cdr.detectChanges();
    } catch (err) {
      console.error('[UserChat] Lỗi khi gửi:', err);
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  isSenderMe(senderId: string) {
    return senderId === this.userId;
  }

  formatTime(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
