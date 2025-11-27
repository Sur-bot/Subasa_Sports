import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-brand-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brand-component.html',
  styleUrls: ['./brand-component.css']
})
export class BrandSliderComponent {

  brands = [
    { img: 'assets/brands/img_brand_1.webp', title: 'Brand 1' },
    { img: 'assets/brands/img_brand_2.webp', title: 'Brand 2' },
    { img: 'assets/brands/img_brand_3.webp', title: 'Brand 3' },
    { img: 'assets/brands/img_brand_4.webp', title: 'Brand 4' },
    { img: 'assets/brands/img_brand_5.webp', title: 'Brand 5' },
    { img: 'assets/brands/img_brand_6.webp', title: 'Brand 6' },
    { img: 'assets/brands/img_brand_7.webp', title: 'Brand 7' },
    { img: 'assets/brands/img_brand_8.webp', title: 'Brand 8' },
    { img: 'assets/brands/img_brand_9.webp', title: 'Brand 9' }
  ];

  currentIndex = 0;
  itemWidth = 144; // 120px + 20px margin

  next() {
    if (this.currentIndex < this.brands.length - 7) {
      this.currentIndex++;
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  get transformValue() {
    return `translateX(-${this.currentIndex * this.itemWidth}px)`;
  }
}
