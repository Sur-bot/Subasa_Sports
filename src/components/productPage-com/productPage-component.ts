import { Component } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'prodcut-component',
  standalone: true,
  imports: [HeaderComponent, CommonModule],
  templateUrl: './productPage-component.html',
  styleUrl: './productPage-component.css',
})

export class ProductPageComponent {

}
