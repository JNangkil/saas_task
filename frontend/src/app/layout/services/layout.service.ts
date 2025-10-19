import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly sidebarCollapsed$ = new BehaviorSubject<boolean>(false);

  toggleSidebar(): void {
    this.sidebarCollapsed$.next(!this.sidebarCollapsed$.value);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed$.next(collapsed);
  }

  observeSidebarCollapsed(): Observable<boolean> {
    return this.sidebarCollapsed$.asObservable();
  }
}
