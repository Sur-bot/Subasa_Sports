import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string; // Tên hiển thị (vd: Sản phẩm)
  url?: string;  // Link (nếu có)
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css'
})
export class BreadcrumbComponent {
  // Input nhận mảng các đường dẫn
  @Input() items: BreadcrumbItem[] = [];
}