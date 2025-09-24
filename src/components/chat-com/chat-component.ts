import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSupportService } from './chat-support.service';

@Component({
  selector: 'ChatComponent',
  standalone: true,
  templateUrl: './chat-component.html',
  styleUrls: ['./chat-component.css'],
  imports: [CommonModule, FormsModule]
})
export class ChatSupportComponent implements OnInit {
  chatService = inject(ChatSupportService);

  userId = localStorage.getItem('userId') || 'guest';
  messages: any[] = [];
  text = '';
  isOpen = false;

  ngOnInit() {
    if (this.userId) {
      this.chatService.getMessages(this.userId).subscribe(msgs => {
        this.messages = msgs;
        this.scrollToBottom();
      });
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.scrollToBottom();
  }

  send() {
    if (!this.text.trim()) return;

    const newMsg = {
      sender: this.userId,
      text: this.text,
      timestamp: Date.now()
    };

    // Hiển thị ngay
    this.messages.push(newMsg);

    // Gửi lên Firestore
    this.chatService.sendMessage(this.userId, this.text);

    this.text = '';
    this.scrollToBottom();
  }

  formatTime(ts: number) {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom() {
    setTimeout(() => {
      const chatBody = document.querySelector('.chat-body');
      if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
  }
}
