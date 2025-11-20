import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  // Trỏ đến file HTML
  templateUrl: './notification-modal.component.html',
  // Trỏ đến file CSS
  styleUrl: './notification-modal.component.css'
})
export class NotificationModalComponent {
  @Input() isVisible: boolean = false;
  @Input() title: string = 'Thông báo';
  @Input() message: string = '';
  @Input() type: 'success' | 'error' = 'success';

  @Output() closeEvent = new EventEmitter<void>();

  close() {
    this.closeEvent.emit();
  }
}