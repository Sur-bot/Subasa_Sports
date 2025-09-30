// src/components/services/product.service.ts 

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs'; 
import { map } from 'rxjs/operators';
import { 
  Firestore, 
  collection, 
  collectionData, 
  CollectionReference, 
  DocumentData,
  query,
  where,
} from '@angular/fire/firestore';
import { Product } from '../product-card/product-card.component'; 

@Injectable({ providedIn: 'root' }) 
export class ProductService {
  
  private productsCollection: CollectionReference<DocumentData>;

  constructor(private firestore: Firestore) {
    // Kết nối đến Collection 'products'
    this.productsCollection = collection(this.firestore, 'products'); 
  } 

  getFlashSaleProducts(): Observable<Product[]> {
    
    // Tạo query: sản phẩm có discount > 0 và status = approved
    const saleProductsQuery = query(
      this.productsCollection, 
      where('discount', '>', 0), 
      where('status', '==', 'approved'),
    );

    // Lấy dữ liệu đã lọc và map về Interface Product
    return collectionData(saleProductsQuery, { idField: 'id' })
      .pipe(
        map((products: any[]) => {
          return products.map(product => {
            
            const price = product.price || 0;
            const discount = product.discount || 0;
            const salePrice = Math.round(price * (1 - discount / 100));
            const discountAmount = price - salePrice;

            return {
              id: product.id,
              description: product.description || 'Chưa có mô tả',
              productName: product.productName || 'Sản phẩm',
              originalPrice: price, 
              salePrice: salePrice,
              discount: discount,
              imageUrl: Array.isArray(product.productImage) 
                          ? product.productImage[0] 
                          : product.productImage || '',
              colors: product.colors || [{ hexCode: '#000000', isSelected: true }],
              quantity: product.quantity || 0,
              productrating: product.productRating || 0,
              status: product.status || 'pending',
              soldCount: product.quantity ? Math.round(product.quantity * 0.1) : 0, 
            } as Product;
          });
        })
      ) as Observable<Product[]>;
  }
}
