import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header-com/header-component';
import { BannerComponent } from '../components/banner-com/banner-component';
import {FooterComponent} from '../components/footer-com/footer-component';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule,FooterComponent,HeaderComponent],
  standalone: true,
  template: `<router-outlet></router-outlet>`,
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Subasa_Sport');
}
