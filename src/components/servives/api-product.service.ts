import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ApiProduct {
  id: string;        // JSON trả về id dạng chuỗi "1NQ..."
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  discount?: string;
  rating?: number;
  quantity?: number;
  sizes?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiProductService {

  private apiUrl = 'https://subasa-sports-1.onrender.com/api/products';

  constructor(private http: HttpClient) { }

  getProducts(): Observable<ApiProduct[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        // Dựa vào hình, API trả về 1 mảng trực tiếp (bắt đầu bằng dấu [ )
        const rawData = Array.isArray(response) ? response : (response.data || []);

        return rawData.map((item: any) => {

          // 1. XỬ LÝ ẢNH (productImage là mảng chuỗi)
          let imageUrl = '';
          if (Array.isArray(item.productImage) && item.productImage.length > 0) {
            // Lấy phần tử đầu tiên trong mảng ảnh
            imageUrl = item.productImage[0];
          } else if (typeof item.productImage === 'string') {
            // Phòng hờ trường hợp nó trả về string
            imageUrl = item.productImage;
          }

          // Nếu không có ảnh, dùng ảnh mặc định
          if (!imageUrl) {
            imageUrl = 'https://via.placeholder.com/300x300?text=No+Image';
          }

          // 2. XỬ LÝ GIÁ VÀ DISCOUNT
          // Trong JSON: price = 2423400, discount = 0 (nghĩa là % giảm)
          const originalPrice = Number(item.price) || 0;
          const discountPercent = Number(item.discount) || 0;

          let finalPrice = originalPrice;
          let displayOldPrice = null;

          // Logic: Nếu có % giảm giá thì tính giá bán, giá gốc dùng để gạch đi
          if (discountPercent > 0) {
            finalPrice = originalPrice * (1 - discountPercent / 100);
            displayOldPrice = originalPrice;
          }

          // Format chuỗi giảm giá (ví dụ: "-10%")
          let discountStr = discountPercent > 0 ? `-${discountPercent}%` : '';

          // 3. MAP DỮ LIỆU
          return {
            id: item.id,
            name: item.productName, // SỬA: Lấy đúng key 'productName'
            price: finalPrice,      // Giá bán thực tế
            oldPrice: displayOldPrice, // Giá cũ (nếu có giảm giá)
            image: imageUrl,        // Link ảnh Cloudinary
            discount: discountStr,
            rating: item.productRating || 5, // SỬA: Lấy đúng key 'productRating'
            quantity: Number(item.quantity) || 0,
            sizes: item.sizes || []

          } as ApiProduct;
        });
      }),
      catchError(error => {
        console.error('Lỗi API:', error);
        return of([]);
      })
    );
  }
}