import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GlobalToast {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toasts$ = new BehaviorSubject<GlobalToast | null>(null);
  private readonly loading$ = new BehaviorSubject<boolean>(false);

  push(toast: GlobalToast): void {
    this.toasts$.next(toast);
  }

  success(message: string): void {
    this.push({ type: 'success', message });
  }

  error(message: string): void {
    this.push({ type: 'error', message });
  }

  info(message: string): void {
    this.push({ type: 'info', message });
  }

  observeToasts(): Observable<GlobalToast | null> {
    return this.toasts$.asObservable();
  }

  setGlobalLoading(isLoading: boolean): void {
    this.loading$.next(isLoading);
  }

  observeGlobalLoading(): Observable<boolean> {
    return this.loading$.asObservable();
  }
}
