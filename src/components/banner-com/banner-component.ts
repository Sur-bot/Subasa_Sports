import { Component, ViewChild, ElementRef, AfterViewInit,CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { register } from 'swiper/element/bundle';

register(); // register web components once

@Component({
  selector: 'BannerComponent',
  templateUrl: './banner-component.html',
  styleUrls: ['./banner-component.css'],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class BannerComponent implements AfterViewInit {
  @ViewChild('swiperEl', { static: false }) swiperEl!: ElementRef;
  private swiper: any;

  ngAfterViewInit() {
    const el = this.swiperEl?.nativeElement;
    if (!el) return;

    // If the element already has instance available
    if (el.swiper) {
      this.swiper = el.swiper;
      console.log('swiper instance available immediately', this.swiper);
    }

    // Listen to web-component "swiper" event (fired when instance ready)
    el.addEventListener('swiper', (ev: any) => {
      // Swiper web component emits event with detail containing instance
      this.swiper = ev?.detail?.[0] ?? ev?.detail ?? el.swiper;
      console.log('swiper event -> instance set', this.swiper);
    });

    // Fallback poll (in case event missed)
    const tryInit = () => {
      if (el.swiper) {
        this.swiper = el.swiper;
        console.log('swiper found by poll', this.swiper);
        return;
      }
      setTimeout(tryInit, 50);
    };
    tryInit();
  }
goPrev() {
  const el = this.swiperEl?.nativeElement;
  if (el && el.swiper) {
    console.log('Prev clicked', el.swiper);
    el.swiper.slidePrev();
  } else {
    console.warn('swiper not ready');
  }
}

goNext() {
  const el = this.swiperEl?.nativeElement;
  if (el && el.swiper) {
    console.log('Next clicked', el.swiper);
    el.swiper.slideNext();
  } else {
    console.warn('swiper not ready');
  }
}

}
