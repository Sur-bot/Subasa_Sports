import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
} from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';
import { Subject } from 'rxjs';

export interface ProductReview {
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: number;
  userId?: string;
}

@Component({
  selector: 'app-product-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-review.component.html',
  styleUrls: ['./product-review.component.css'],
})
export class ProductReviewComponent implements OnInit, OnDestroy {
  @Input() set productId(value: string | number | undefined) {
    const newId = value ? String(value) : '';

    // ✅ Only reinit if productId actually changed and is not empty
    if (newId && newId !== this.productIdStr) {
      console.log('[ProductReview] Product ID changed from', this.productIdStr, 'to', newId);
      this.productIdStr = newId;
      this.cleanupListeners();
      this.initializeListeners();
      this.tryCheckPurchased();
    }
  }

  // Form states
  rating: number = 0;
  hoverRating: number = 0;
  comment: string = '';
  images: string[] = [];
  maxImages = 4;
  isSubmitting = false;
  isLoading = true;

  // Rating states
  productRating: number = 0;
  averageRating: number = 0;
  totalReviews: number = 0;

  reviews: ProductReview[] = [];
  currentUser: User | null = null;
  selectedRatingFilter: number = 0;

  private destroy$ = new Subject<void>();
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private unsubscribeReviews: Unsubscribe | null = null;
  private unsubscribeProductRating: Unsubscribe | null = null;
  productIdStr: string = '';
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    console.log('[ProductReview] Component initialized');
    this.setupAuthListener();

  }

  private setupAuthListener(): void {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      console.log('[ProductReview] Current user:', user?.email || 'Anonymous');
    });
  }
  private initializeListeners(): void {
    if (!this.productIdStr) {
      console.warn('[ProductReview] Product ID is empty, cannot initialize listeners');
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    console.log('[ProductReview] Initializing listeners for product:', this.productIdStr);
    this.isLoading = true;
    this.retryCount = 0;

    // Setup both listeners
    this.setupProductRatingListener();
    this.setupReviewsListener();
  }

  private cleanupListeners(): void {
    console.log('[ProductReview] Cleaning up old listeners');
    if (this.unsubscribeReviews) {
      this.unsubscribeReviews();
      this.unsubscribeReviews = null;
    }
    if (this.unsubscribeProductRating) {
      this.unsubscribeProductRating();
      this.unsubscribeProductRating = null;
    }
  }
  canReview: boolean = false;
  private checkUserPurchased(): void {
    console.log("đang check đã mua");
    const userId = localStorage.getItem('userId') || this.currentUser?.uid;
    if (!userId || !this.productIdStr) {
      this.canReview = false;
      return;
    }

    const ordersRef = collection(this.firestore, 'orders');
    const q = query(ordersRef); 
    getDocs(q).then((snapshot) => {
      let purchased = false;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data(); // data: DocumentData
        if (data['userId'] === userId && Array.isArray(data['items'])) {
          if (data['items'].some((item: any) => item['productId'] === this.productIdStr)) {
            purchased = true;
          }
        }
      });

      this.canReview = purchased;
      this.cdr.detectChanges();
    }).catch((err) => {
      console.error('[ProductReview] Error checking orders:', err);
      this.canReview = false;
    });
  }
  private tryCheckPurchased(): void {
    if (!this.productIdStr) return;
    if (!this.currentUser && !localStorage.getItem('userId')) return;

    this.checkUserPurchased();
  }
  private setupProductRatingListener(): void {
    if (!this.productIdStr) return;

    const productDoc = doc(this.firestore, `products/${this.productIdStr}`);

    this.unsubscribeProductRating = onSnapshot(
      productDoc,
      (snapshot) => {
        console.log('[ProductReview] Product snapshot received, exists:', snapshot.exists());

        if (snapshot.exists()) {
          const data = snapshot.data() as DocumentData;
          this.productRating = data['productRating'] ?? 0;
          console.log('[ProductReview] Product rating loaded:', this.productRating);
        } else {
          console.log('[ProductReview] Product document not found, using default rating');
          // Don't reset to 0, might be loading
          if (this.productRating === 0) {
            this.productRating = 0;
          }
        }

        this.isLoading = false;
        this.calculateAverageRating();
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('[ProductReview] Error in product rating listener:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        // Don't retry immediately for product rating
      }
    );
  }

  private setupReviewsListener(): void {
    if (!this.productIdStr) return;

    const reviewsRef = collection(this.firestore, `products/${this.productIdStr}/reviews`);
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));

    this.unsubscribeReviews = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        console.log('[ProductReview] Reviews snapshot received, count:', snapshot.size);

        this.reviews = snapshot.docs.map((doc) => {
          const data = doc.data() as DocumentData;
          return {
            id: doc.id,
            name: data['name'] || 'Ẩn danh',
            email: data['email'] || '',
            avatar: data['avatar'] || null,
            rating: data['rating'] || 0,
            comment: data['comment'] || '',
            images: data['images'] || [],
            createdAt: data['createdAt'] || 0,
            userId: data['userId'] || '',
          } as ProductReview;
        });

        console.log('[ProductReview] Reviews loaded successfully:', this.reviews.length);
        this.calculateAverageRating();
        this.cdr.detectChanges();
        this.retryCount = 0; // Reset retry count on success
      },
      (error: any) => {
        console.error('[ProductReview] Error in reviews listener (with orderBy):', error?.code);

        // Retry with fallback query
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`[ProductReview] Retrying with fallback (attempt ${this.retryCount}/${this.maxRetries})...`);

          // Small delay before retry
          setTimeout(() => {
            this.setupReviewsListenerFallback(reviewsRef);
          }, 500);
        } else {
          console.error('[ProductReview] Max retries reached, showing fallback');
          this.setupReviewsListenerFallback(reviewsRef);
        }
      }
    );
  }

  private setupReviewsListenerFallback(reviewsRef: any): void {
    if (!this.productIdStr) return;

    // Unsubscribe from previous listener if exists
    if (this.unsubscribeReviews) {
      this.unsubscribeReviews();
    }

    this.unsubscribeReviews = onSnapshot(
      reviewsRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        console.log('[ProductReview] Reviews snapshot (fallback), count:', snapshot.size);

        this.reviews = snapshot.docs
          .map((doc) => {
            const data = doc.data() as DocumentData;
            return {
              id: doc.id,
              name: data['name'] || 'Ẩn danh',
              email: data['email'] || '',
              avatar: data['avatar'] || null,
              rating: data['rating'] || 0,
              comment: data['comment'] || '',
              images: data['images'] || [],
              createdAt: data['createdAt'] || 0,
              userId: data['userId'] || '',
            } as ProductReview;
          })
          // Manual sort by createdAt descending
          .sort((a: ProductReview, b: ProductReview) => b.createdAt - a.createdAt);

        console.log('[ProductReview] Reviews loaded (fallback):', this.reviews.length);
        this.calculateAverageRating();
        this.cdr.detectChanges();
      },
      (error: any) => {
        console.error('[ProductReview] Error in reviews listener (fallback):', error);
        this.reviews = [];
        this.calculateAverageRating();
        this.cdr.detectChanges();
      }
    );
  }

  private calculateAverageRating(): void {
    if (this.reviews.length === 0) {
      this.averageRating = this.productRating;
      this.totalReviews = 0;
    } else {
      const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
      this.averageRating = Math.round((sum / this.reviews.length) * 10) / 10;
      this.totalReviews = this.reviews.length;
    }
  }

  setRating(n: number): void {
    this.rating = n;
  }

  onStarEnter(n: number): void {
    this.hoverRating = n;
  }

  onStarLeave(): void {
    this.hoverRating = 0;
  }

  onFilesChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    const maxSize = 5 * 1024 * 1024;
    const files = Array.from(input.files).slice(0, this.maxImages - this.images.length);

    files.forEach((file) => {
      if (file.size > maxSize) {
        alert(`Ảnh ${file.name} quá lớn (tối đa 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => {
        const result = ev.target?.result as string;
        if (result) {
          this.images.push(result);
          this.cdr.detectChanges();
        }
      };
      reader.onerror = () => {
        console.error('[ProductReview] Error reading file:', file.name);
      };
      reader.readAsDataURL(file);
    });

    input.value = '';
  }

  removeImage(index: number): void {
    this.images.splice(index, 1);
  }

  async submitReview(): Promise<void> {
    if (this.rating === 0) {
      alert('Vui lòng chọn số sao trước khi gửi đánh giá.');
      return;
    }
    if (!this.comment.trim()) {
      alert('Vui lòng nhập nội dung đánh giá.');
      return;
    }
    if (!this.productIdStr) {
      alert('Không tìm thấy ID sản phẩm.');
      return;
    }

    this.isSubmitting = true;
    console.log('[ProductReview] Submitting review for product:', this.productIdStr);

    try {
      const reviewsCollection = collection(this.firestore, `products/${this.productIdStr}/reviews`);

      const { userName, userEmail, userId } = this.getUserInfo();

      console.log('[ProductReview] Adding review from:', userName);

      const reviewDocRef = await addDoc(reviewsCollection, {
        name: userName,
        email: userEmail,
        rating: this.rating,
        comment: this.comment.trim(),
        images: this.images,
        createdAt: Date.now(),
        userId: userId,
        avatar: this.currentUser?.photoURL || null,
      });

      console.log('[ProductReview] Review added with ID:', reviewDocRef.id);

      const reviewsRef = collection(this.firestore, `products/${this.productIdStr}/reviews`);
      const reviewsSnapshot = await getDocs(reviewsRef);

      let totalRating = 0;
      reviewsSnapshot.forEach((docSnap) => {
        const reviewData = docSnap.data() as DocumentData;
        totalRating += reviewData['rating'] || 0;
      });

      const newAverageRating =
        reviewsSnapshot.size > 0
          ? Math.round((totalRating / reviewsSnapshot.size) * 10) / 10
          : this.productRating;

      console.log('[ProductReview] New average rating:', newAverageRating);

      const productDoc = doc(this.firestore, `products/${this.productIdStr}`);
      await updateDoc(productDoc, {
        productRating: newAverageRating,
      });

      console.log('[ProductReview] Product rating updated');

      this.resetForm();
      this.isSubmitting = false;

      alert('Cảm ơn bạn đã đánh giá sản phẩm!');
      this.cdr.detectChanges();
    } catch (error) {
      console.error('[ProductReview] Error submitting review:', error);
      alert('Lỗi khi gửi đánh giá. Vui lòng thử lại.');
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  private getUserInfo(): { userName: string; userEmail: string; userId: string } {
    if (this.currentUser) {
      return {
        userName:
          this.currentUser.email?.split('@')[0] || this.currentUser.displayName || 'Ẩn danh',
        userEmail: this.currentUser.email || '',
        userId: this.currentUser.uid,
      };
    }

    const guestId = localStorage.getItem('userId') || `guest_${Date.now()}`;
    return {
      userName: 'Khách hàng',
      userEmail: '',
      userId: guestId,
    };
  }

  private resetForm(): void {
    this.rating = 0;
    this.hoverRating = 0;
    this.comment = '';
    this.images = [];
  }

  timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  }

  ngOnDestroy() {
    this.cleanupListeners();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStarCount(stars: number): number {
    return this.reviews.filter((r) => r.rating === stars).length;
  }

  getStarPercentage(stars: number): number {
    if (this.reviews.length === 0) return 0;
    return (this.getStarCount(stars) / this.reviews.length) * 100;
  }

  filterByRating(stars: number): void {
    this.selectedRatingFilter = stars;
  }

  clearFilter(): void {
    this.selectedRatingFilter = 0;
  }

  getFilteredReviews(): ProductReview[] {
    if (this.selectedRatingFilter === 0) {
      return this.reviews;
    }
    return this.reviews.filter((r) => r.rating === this.selectedRatingFilter);
  }
}