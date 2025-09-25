import { Component } from '@angular/core';
import e from 'express';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'header-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {
  isOpen = false;

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  //category
  openCategory: string | null = null;

  toggleCategory(category: string) {
    if (this.openCategory === category) {
      this.openCategory = null; // bấm lần 2 thì đóng lại
    } else {
      this.openCategory = category; // mở danh mục được chọn
    }
  }
}
