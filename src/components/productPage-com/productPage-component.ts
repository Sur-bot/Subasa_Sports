import { Component } from '@angular/core';
import { HeaderComponent } from '../header-com/header-component';

@Component({
  selector: 'prodcut-component',
  standalone: true,
  imports:[HeaderComponent],
  templateUrl: './productPage-component.html',
  styleUrl: './productPage-component.css',
})
export class ProducComponent {}
