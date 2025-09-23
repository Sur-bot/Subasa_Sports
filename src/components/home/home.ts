import { Component } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';
import { BannerComponent } from '../banner-com/banner-component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BannerComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css']   
})
export class HomeComponent {}
