import { Component } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';
import { CommonModule } from '@angular/common';
import { ProductListComponent } from '../product-list/product-list.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
@Component({
  selector: 'prodcut-component',
  standalone: true,
  imports: [HeaderComponent, CommonModule, ProductListComponent, BreadcrumbComponent],
  templateUrl: './productPage-component.html',
  styleUrl: './productPage-component.css',
})

export class ProductPageComponent {

}
