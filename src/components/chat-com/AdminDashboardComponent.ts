import { Component, Input, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatSupportService } from './chat-support.service';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'AdminChatComponent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-component.html',
  styleUrls: ['./admin-component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewChecked {
  @Input() adminId: string = '';

  users: any[] = [];
  selectedUserId: string | null = null;
  selectedUserEmail: string | null = null;
  messages: any[] = [];
  text = '';

  isChatOpen = false;
  showUsers = false;

  @ViewChild('bottomRef') bottomRef!: ElementRef;

  constructor(
    private chatService: ChatSupportService,
    private cdr: ChangeDetectorRef,
    private auth: Auth
  ) {}

  ngOnInit() {
    if (!this.adminId) return;

    this.chatService.getActiveUsers().subscribe(users => {
      this.users = users.filter(u => u.userId !== this.adminId);
      this.cdr.detectChanges();
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

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      setTimeout(() => this.scrollToBottom(), 100); // scroll ngay khi bật box
    }
  }

  selectUser(userId: string, email?: string) {
    this.selectedUserId = null;
    this.selectedUserEmail = null;
    this.messages = [];

    this.selectedUserId = userId;
    this.selectedUserEmail = email || null;
    this.showUsers = false;

    this.chatService.getMessages(userId).subscribe(msgs => {
      this.messages = msgs;
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
  }

  async send() {
    if (!this.text.trim() || !this.selectedUserId) return;

    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      console.error('Admin chưa đăng nhập');
      return;
    }

    await this.chatService.sendMessage(
      this.selectedUserId,
      this.adminId,
      this.text,
      currentUser.email!
    );

    this.text = '';
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  formatTime(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  isSenderAdmin(sender: string) {
    return sender === this.adminId;
  }
}
