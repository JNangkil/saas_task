import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    title?: string;
    duration?: number;
    dismissible?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toasts$ = new BehaviorSubject<Toast[]>([]);
    private defaultDuration = 5000;

    get toasts(): Observable<Toast[]> {
        return this.toasts$.asObservable();
    }

    /**
     * Show a success toast
     */
    success(message: string, title?: string, duration?: number): void {
        this.show({ type: 'success', message, title, duration });
    }

    /**
     * Show an error toast
     */
    error(message: string, title?: string, duration?: number): void {
        this.show({ type: 'error', message, title, duration: duration || 8000 });
    }

    /**
     * Show a warning toast
     */
    warning(message: string, title?: string, duration?: number): void {
        this.show({ type: 'warning', message, title, duration });
    }

    /**
     * Show an info toast
     */
    info(message: string, title?: string, duration?: number): void {
        this.show({ type: 'info', message, title, duration });
    }

    /**
     * Show a custom toast
     */
    show(options: Partial<Toast> & { type: Toast['type']; message: string }): void {
        const toast: Toast = {
            id: this.generateId(),
            type: options.type,
            message: options.message,
            title: options.title,
            duration: options.duration ?? this.defaultDuration,
            dismissible: options.dismissible ?? true
        };

        const current = this.toasts$.getValue();
        this.toasts$.next([...current, toast]);

        // Auto dismiss after duration
        if (toast.duration && toast.duration > 0) {
            setTimeout(() => {
                this.dismiss(toast.id);
            }, toast.duration);
        }
    }

    /**
     * Dismiss a toast by ID
     */
    dismiss(id: string): void {
        const current = this.toasts$.getValue();
        this.toasts$.next(current.filter(t => t.id !== id));
    }

    /**
     * Dismiss all toasts
     */
    dismissAll(): void {
        this.toasts$.next([]);
    }

    private generateId(): string {
        return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
