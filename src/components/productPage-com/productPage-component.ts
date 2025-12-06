import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; // 1. Thêm Router vào đây
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
export class ProductPageComponent implements OnInit {
  
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

  // 2. Inject thêm Router vào constructor
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    // Lắng nghe thay đổi trên URL
    this.route.queryParams.subscribe(params => {
      
      // Lấy tham số tìm kiếm (hỗ trợ cả 'search' của bạn và 'q' của header cũ)
      const searchKey = params['search'] || params['q'];
      // Lấy tham số danh mục (khi bấm menu sidebar)
      const categoryKey = params['category'];

      // Reset trạng thái mỗi khi URL đổi để tránh bị lẫn lộn
      this.searchText = '';
      this.tempFilters = { price: [], brand: [], type: [] };
      this.filters = { price: [], brand: [], type: [] }; // Reset luôn filter chính

      // Trường hợp 1: Có từ khóa tìm kiếm
      if (searchKey) {
        this.searchText = searchKey;
      }
      
      // Trường hợp 2: Có chọn danh mục (Balo, Găng tay...)
      else if (categoryKey) {
        this.tempFilters.type = [categoryKey]; // Tự động tick vào loại đó
      }

      // Áp dụng bộ lọc ngay lập tức
      this.applyFilters();
    });
  }

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

  // --- HÀM 5: Xóa tìm kiếm (Được cập nhật để xóa trên URL) ---
  clearSearch() {
    this.searchText = '';
    
    // Xóa tham số trên URL để trang web sạch sẽ
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { search: null, q: null }, // Xóa cả 'search' và 'q'
      queryParamsHandling: 'merge'
    });
    
    this.applyFilters();
  }

  // --- HÀM 6: (MỚI) Reset tất cả - Dùng cho nút "Xóa chọn" ---
  resetAll() {
    this.searchText = '';
    this.tempFilters = { price: [], brand: [], type: [] };
    this.filters = { price: [], brand: [], type: [] };
    
    // Điều hướng về trang gốc /products (không có ? gì hết)
    this.router.navigate(['/products']);
  }
}