import { Component } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';
import { CommonModule } from '@angular/common';
import { ProductListComponent } from '../product-list/product-list.component';
@Component({
  selector: 'prodcut-component',
  standalone: true,
  imports: [HeaderComponent, CommonModule, ProductListComponent],
  templateUrl: './productPage-component.html',
  styleUrl: './productPage-component.css',
})

export class ProductPageComponent {

}
