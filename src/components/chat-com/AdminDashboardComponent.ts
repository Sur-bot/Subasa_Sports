import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSupportService } from './chat-support.service';

@Component({
  selector: 'AdminChatComponent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-component.html',
  styleUrls: ['./admin-component.css']
})
export class AdminDashboardComponent implements OnInit {
  @Input() adminId: string = '';
  users: any[] = [];
  selectedUserId: string | null = null;
  selectedUserEmail: string | null = null;
  messages: any[] = [];
  text = '';

  constructor(
    private chatService: ChatSupportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.adminId) return;

    this.chatService.getActiveUsers().subscribe(users => {
      this.users = users.filter(u => u.userId !== this.adminId);
      this.cdr.detectChanges();
    });
  }

  selectUser(userId: string, email?: string) {
    this.selectedUserId = userId;
    this.selectedUserEmail = email || null;

    this.chatService.getMessages(userId).subscribe(msgs => {
      this.messages = msgs;
      this.cdr.detectChanges();
    });
  }

  async send() {
    if (!this.text.trim() || !this.selectedUserId) return;
    await this.chatService.sendMessage(this.selectedUserId, this.adminId, this.text);
    this.text = '';
    this.cdr.detectChanges();
  }

  formatTime(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  isSenderAdmin(sender: string) {
    return sender === this.adminId;
  }
}
