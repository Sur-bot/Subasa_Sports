import { Routes } from '@angular/router';
import { LoginComponent } from '../components/login-com/login-component';
import {HomeComponent} from '../components/home/home'
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' }, // route mặc định
  { path: 'login', component: LoginComponent },
  { path: 'home', component: HomeComponent },
];
