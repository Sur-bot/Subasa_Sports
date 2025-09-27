import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Cần thiết cho *ngFor và *ngIf
import { Observable } from 'rxjs';
import { NotificationFloatingService, Feature } from './notification-floating-service'; 


@Component({
  selector: 'app-notification-floating', // Selector chuẩn
  
  // KHẮC PHỤC LỖI NG2012 VÀ *ngFor
  standalone: true, 
  imports: [CommonModule], 
  // END KHẮC PHỤC LỖI
  
  templateUrl: './notification-floating-component.html',
  styleUrls: ['./notification-floating-component.css']
})
export class NotificationFloatingComponent implements OnInit {
  
  isModalOpen: boolean = false;
  
  // KHAI BÁO DỮ LIỆU THAY THẾ CHO MẢNG GIẢ LẬP
  features$!: Observable<Feature[]>; // Dùng $ để ký hiệu đây là Observable
  
  // INJECT SERVICE
  constructor(private notificationfloatingService: NotificationFloatingService) { } 

  ngOnInit(): void {
    // GỌI HÀM LẤY DỮ LIỆU TỪ SERVICE
    this.features$ = this.notificationfloatingService.getFeatures();
  }

  toggleModal(): void {
    this.isModalOpen = !this.isModalOpen;
  }
  
  closeModal(): void {
    this.isModalOpen = false;
  }
}