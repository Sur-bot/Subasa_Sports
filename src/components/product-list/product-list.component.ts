import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiProductService, ApiProduct } from '../servives/api-product.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css'
})
export class ProductListComponent implements OnInit {

  products: ApiProduct[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private apiService: ApiProductService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchProducts();
  }

  fetchProducts() {
    this.isLoading = true;
    this.apiService.getProducts().subscribe({
      next: (data) => {
        
        
        this.products = data.filter(item => {
          
          let totalStock = Number(item.quantity) || 0;

          
          if (item.sizes && item.sizes.length > 0) {
            
            const sizeStock = item.sizes.reduce((sum: number, size: any) => {
              return sum + (Number(size.quantity) || 0);
            }, 0);

          
            if (sizeStock > 0) {
              totalStock = sizeStock;
            } else {
               
               totalStock = 0;
            }
          }

          
          return totalStock > 0;
        });
        // 

        this.isLoading = false;
        this.cdr.detectChanges();
        
        console.log(`Hiển thị ${this.products.length} sản phẩm còn hàng.`);
      },
      error: (err) => {
        this.errorMessage = 'Lỗi tải trang';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  handleImageError(event: any) {
    event.target.src = 'https://via.placeholder.com/300x300?text=Sudes+Sport';
  }
  
 
}