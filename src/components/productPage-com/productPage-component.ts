import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header-com/header-component';
import { ProductListComponent } from '../product-list/product-list.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';

type FilterKey = 'price' | 'brand' | 'type';

@Component({
  selector: 'prodcut-component', 
  standalone: true,
  imports: [HeaderComponent, CommonModule, ProductListComponent, BreadcrumbComponent],
  templateUrl: './productPage-component.html',
  styleUrl: './productPage-component.css',
})
export class ProductPageComponent {
  
  // 1. Biến tìm kiếm
  searchText = ''; 
  
  // 2. Các biến cho Dropdown Sắp xếp
  currentSort = 'default';
  currentLabel = 'Mặc định';
  isSortOpen = false;

  // 3. Biến Filter chính (Truyền xuống con)
  filters: Record<FilterKey, string[]> = { price: [], brand: [], type: [] };

  // 4. Biến Filter tạm (Lưu trạng thái tick khi chưa bấm nút "Lọc")
  tempFilters: Record<FilterKey, string[]> = { price: [], brand: [], type: [] };

  // --- HÀM 1: Nhận từ khóa tìm kiếm từ Header ---
  handleSearchFromHeader(keyword: any) {
    this.searchText = keyword; 
  }

  // --- HÀM 2: Xử lý khi tick Checkbox (Lưu vào biến tạm) ---
  onFilterChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const group = input.dataset['group'] as FilterKey;
    const value = input.value;
    const checked = input.checked;

    if (!group || !value) return;

    let newGroupArray = [...this.tempFilters[group]];

    if (checked) {
      if (!newGroupArray.includes(value)) newGroupArray.push(value);
    } else {
      newGroupArray = newGroupArray.filter((v) => v !== value);
    }

    this.tempFilters = { ...this.tempFilters, [group]: newGroupArray };
  }

  // --- HÀM 3: Bấm nút "Lọc sản phẩm" ---
  applyFilters() {
    // Copy từ biến tạm sang biến chính -> Kích hoạt ngOnChanges ở con
    this.filters = { ...this.tempFilters };
  }

  // --- HÀM 4: Logic Dropdown Sắp xếp ---
  toggleSortMenu() {
    this.isSortOpen = !this.isSortOpen;
  }

  onSortChange(sortType: string, label: string, event: Event) {
    event.preventDefault(); 
    this.currentSort = sortType;
    this.currentLabel = label;
    this.isSortOpen = false; // Đóng menu sau khi chọn
  }
}