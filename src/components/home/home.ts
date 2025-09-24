import { Component } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';
import { BannerComponent } from '../banner-com/banner-component';
import {ChatSupportComponent} from '../chat-com/chat-component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [BannerComponent,HeaderComponent,ChatSupportComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css']   
})
export class HomeComponent {}
