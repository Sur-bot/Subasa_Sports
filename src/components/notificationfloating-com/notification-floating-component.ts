import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Cần thiết cho *ngFor và *ngIf
import { Observable } from 'rxjs';
import { NotificationFloatingService, Feature } from './notification-floating-service';
import { Auth } from '@angular/fire/auth';


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
  isAdmin: boolean = false;
  isModalOpen: boolean = false;

  // KHAI BÁO DỮ LIỆU THAY THẾ CHO MẢNG GIẢ LẬP
  features$!: Observable<Feature[]>; // Dùng $ để ký hiệu đây là Observable

  // INJECT SERVICE
  constructor(
    private notificationfloatingService: NotificationFloatingService,
    private auth: Auth
  ) { }

  ngOnInit(): void {
    this.features$ = this.notificationfloatingService.getFeatures();
    this.auth.onAuthStateChanged(user => {
      if (user?.uid === "ucqeK6JbQMViknAiaXDya5iufeE3") {
        this.isAdmin = true;
      } else {
        this.isAdmin = false;
      }
    });


  }
  async addNotification() {
  const name = prompt("Nhập nội dung thông báo:");
  if (!name) return;

  const feature: Feature = {
    name,
    link: "#"
  };

  await this.notificationfloatingService.addFeature(feature);
  console.log("✅ Thêm notification thành công!");
}


  toggleModal(): void {
    this.isModalOpen = !this.isModalOpen;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }
}