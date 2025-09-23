import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header-com/header-component';
import { BannerComponent } from '../components/banner-com/banner-component';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent,BannerComponent],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Subasa_Sport');
}
