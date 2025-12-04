// src/services/product.service.ts

import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, from } from 'rxjs';
import { map, switchMap, catchError, filter } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
  DocumentData,
  query,
  where,
  doc,
  getDoc,
  DocumentSnapshot,
  Query, // Thêm Query để tái sử dụng code
  updateDoc
} from '@angular/fire/firestore';
import { Product } from '../product-card/product-card.component';

@Injectable({ providedIn: 'root' })
export class ProductService {

  private productsCollection: CollectionReference<DocumentData>;
  private categoryCollection: CollectionReference<DocumentData>; // Thêm collection category

  constructor(private firestore: Firestore) {
    this.productsCollection = collection(this.firestore, 'products');
    this.categoryCollection = collection(this.firestore, 'category'); // Khởi tạo collection category
  }

  // Lấy tất cả sản phẩm
  getAllProducts(): Observable<Product[]> {
    // Tạo câu truy vấn cho tất cả sản phẩm
    const allProductsQuery = query(
      this.productsCollection,
      where('status', '==', 'approved')
    );
    // Gọi hàm helper để xử lý logic phức tạp
    return this.fetchProductsWithCategoryInfo(allProductsQuery);
  }

  // Lấy sản phẩm Flash Sale
  getFlashSaleProducts(): Observable<Product[]> {
    // Tạo câu truy vấn cho sản phẩm sale
    const saleProductsQuery = query(
      this.productsCollection,
      where('discount', '>', 0),
      where('status', '==', 'approved'),
    );
    // Gọi hàm helper để xử lý logic phức tạp
    return this.fetchProductsWithCategoryInfo(saleProductsQuery);
  }

  /**
   * HÀM HELPER TÁI SỬ DỤNG:
   * Nhận vào một câu truy vấn, lấy sản phẩm và tự động gộp thông tin 'hasSize' từ category.
   */
  private fetchProductsWithCategoryInfo(productsQuery: Query<DocumentData>): Observable<Product[]> {
    return collectionData(productsQuery, { idField: 'id' })
      .pipe(
        switchMap((products: any[]) => {
          console.log('1. Lấy được sản phẩm thô từ Firestore:', products);

          if (products.length === 0) {
            return of([]); // Trả về mảng rỗng nếu không có sản phẩm
          }

          const productObservables = products.map(product => {
            // Kiểm tra xem sản phẩm có trường 'category' không
            if (!product.category) {
              console.error('LỖI: Sản phẩm này thiếu trường "category":', product);
              return of(this.mapToProduct({ ...product, hasSize: false }));
            }

            const categoryDocRef = doc(this.categoryCollection, product.category);
            
            return from(getDoc(categoryDocRef)).pipe(
              map((categoryDoc: DocumentSnapshot) => {
                const categoryData = categoryDoc.data();
                console.log(`2. Đã lấy category cho sản phẩm: "${product.productName}". Dữ liệu category:`, categoryData);

                const combinedProductData = {
                  ...product,
                  hasSize: categoryData ? categoryData['hasSize'] === true : false
                };
                return this.mapToProduct(combinedProductData);
              }),
              // Xử lý lỗi cho từng sản phẩm để không làm hỏng cả danh sách
              catchError(error => {
                console.error(`LỖI khi lấy category "${product.category}" cho sản phẩm "${product.productName}":`, error);
                // Nếu có lỗi, vẫn trả về sản phẩm nhưng mặc định không có size
                return of(this.mapToProduct({ ...product, hasSize: false }));
              })
            );
          });
          
          return forkJoin(productObservables).pipe(
            map((productList: Product[]) => {
              // Lọc: Chỉ giữ lại những sản phẩm có tổng tồn kho > 0
              return productList.filter(p => {
                let realStock = p.quantity || 0;

                // Nếu sản phẩm có size (Giày, Áo...), tính tổng tồn kho các size
                if (p.hasSize && p.sizes && p.sizes.length > 0) {
                  const totalSizeQty = p.sizes.reduce((sum, s) => sum + (s.quantity || 0), 0);
                  // Nếu tổng size > 0 thì dùng tổng size làm mốc tồn kho
                  if (totalSizeQty > 0) {
                    realStock = totalSizeQty;
                  } else {
                    // Nếu có mảng size mà tổng bằng 0 -> Hết hàng
                    realStock = 0;
                  }
                }

                // Giữ lại sản phẩm nếu tồn kho > 0
                return realStock > 0;
              });
            })
          )
        })
      );
  }

  /**
   * Hàm helper để chuyển đổi dữ liệu thô từ Firestore sang đối tượng Product chuẩn.
   * Hàm này không cần thay đổi.
   */
  private mapToProduct(product: any): Product {
    const price = product.price || 0;
    const discount = product.discount || 0;

    return {
      id: product.id,
      productName: product.productName || 'Sản phẩm',
      description: product.description || 'Chưa có mô tả',
      brand: product.brand || 'Chưa có thương hiệu',
      category: product.category || 'Uncategorized',
      originalPrice: price,
      salePrice: Math.round(price * (1 - discount / 100)),
      discount: discount,
      imageUrl: Array.isArray(product.productImage)
        ? product.productImage[0]
        : product.productImage || '',
      productrating: product.productRating || 0,
      status: product.status || 'pending',
      soldCount: product.soldCount || 0,
      colors: product.colors || [],
      
      // 'hasSize' giờ đây đã được cung cấp từ logic kết hợp ở trên
      hasSize: product.hasSize === true, // Đảm bảo là boolean
      sizes: product.sizes || [],
      quantity: product.quantity || 0,
      ownerEmail: product.ownerEmail || '',
    } as Product;
  }
  updateProductStock(productId: string, newQuantity: number, newSoldCount: number): Observable<void> {
    const productDocRef = doc(this.productsCollection, productId);
    
    // updateDoc trả về Promise, ta dùng 'from' để chuyển thành Observable
    return from(updateDoc(productDocRef, {
      quantity: newQuantity,
      soldCount: newSoldCount
    }));
  }
}