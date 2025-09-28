import { ServerRoute, RenderMode } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server }, 
  { path: 'login', renderMode: RenderMode.Server },
  { path: 'home', renderMode: RenderMode.Server },
  { path: 'product', renderMode: RenderMode.Server },
];
