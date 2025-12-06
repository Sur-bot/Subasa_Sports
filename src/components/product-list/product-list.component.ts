import { Component, OnInit, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiProductService, ApiProduct } from '../servives/api-product.service';
import { RouterLink } from "@angular/router";
import { RouterModule } from '@angular/router';
type FilterKey = 'price' | 'brand' | 'type';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule  ], 
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css'
})
export class ProductListComponent implements OnInit, OnChanges {

  @Input() filters: Record<FilterKey, string[]> = { price: [], brand: [], type: [] };
  @Input() sortOption = 'default';
  @Input() searchText = ''; // Nhận tìm kiếm

  products: ApiProduct[] = [];
  displayProducts: ApiProduct[] = []; 
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(private apiService: ApiProductService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchProducts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Nếu có bất kỳ thay đổi nào (lọc, sắp xếp, tìm kiếm) -> chạy lại applyFilters
    if ((changes['filters'] || changes['sortOption'] || changes['searchText']) && this.products.length > 0) {
      this.applyFilters();
    }
  }

  fetchProducts() {
    this.isLoading = true;
    this.apiService.getProducts().subscribe({
      next: (data) => {
        // LOGIC LỌC TỒN KHO (Giữ nguyên)
        this.products = data.filter(item => {
          let totalStock = Number(item.quantity) || 0;
          if (item.sizes && item.sizes.length > 0) {
            const sizeStock = item.sizes.reduce((sum: number, size: any) => sum + (Number(size.quantity) || 0), 0);
            if (sizeStock > 0) totalStock = sizeStock; else totalStock = 0;
          }
          return totalStock > 0;
        });

        this.displayProducts = [...this.products];
        this.isLoading = false;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Lỗi tải sản phẩm';
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    let result = [...this.products]; 

    // 1. TÌM KIẾM
    if (this.searchText) {
      const keyword = this.searchText.toLowerCase().trim();
      result = result.filter(p => p.name.toLowerCase().includes(keyword));
    }

    // 2. LỌC GIÁ
    if (this.filters.price && this.filters.price.length > 0) {
      result = result.filter((p) => {
        const price = Number(p.price || 0);
        return this.filters.price.some((rangeStr) => {
          const { min, max } = this.parsePriceRange(rangeStr);
          return price >= min && price <= max;
        });
      });
    }

    // 3. LỌC HÃNG
    if (this.filters.brand && this.filters.brand.length > 0) {
      result = result.filter((p) => {
        const productBrand = (p.brand || '').toLowerCase();
        return this.filters.brand.some((selectedBrand) => 
          productBrand.includes(selectedBrand.toLowerCase())
        );
      });
    }

    // 4. LỌC LOẠI
    if (this.filters.type && this.filters.type.length > 0) {
      result = result.filter((p) => {
        const productCat = (p.category || '').toLowerCase();
        return this.filters.type.some((selectedType) => 
           productCat === selectedType.toLowerCase()
        );
      });
    }

    // 5. SẮP XẾP
    this.sortResult(result);

    this.displayProducts = result;
  }

  private sortResult(list: ApiProduct[]) {
    switch (this.sortOption) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      default: break;
    }
  }

  private parsePriceRange(range: string): { min: number; max: number } {
    if (!range) return { min: 0, max: Infinity };
    if (range.includes('max')) {
      const min = Number(range.split('-')[0]);
      return { min, max: Infinity };
    }
    const parts = range.split('-');
    if (parts.length === 2) {
      return { min: Number(parts[0]), max: Number(parts[1]) };
    }
    return { min: 0, max: Infinity };
  }
}