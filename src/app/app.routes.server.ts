import { ServerRoute, RenderMode } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Server }, 
  { path: 'login', renderMode: RenderMode.Server },
  { path: 'home', renderMode: RenderMode.Server },
  { path: 'products', renderMode: RenderMode.Server },
  {path: 'product/:id', renderMode: RenderMode.Server},
  {path: 'success', renderMode: RenderMode.Server}
];
