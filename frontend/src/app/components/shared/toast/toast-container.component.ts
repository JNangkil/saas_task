import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastService, Toast } from '../../../services/toast.service';

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts; trackBy: trackByToast"
        class="toast"
        [class]="'toast-' + toast.type"
        [@toastAnimation]="'visible'">
        
        <div class="toast-icon">
          <ng-container [ngSwitch]="toast.type">
            <svg *ngSwitchCase="'success'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M6 10L9 13L14 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg *ngSwitchCase="'error'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg *ngSwitchCase="'warning'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L18.66 17H1.34L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M10 8V11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="10" cy="14" r="1" fill="currentColor"/>
            </svg>
            <svg *ngSwitchCase="'info'" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 9V14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="10" cy="6" r="1" fill="currentColor"/>
            </svg>
          </ng-container>
        </div>
        
        <div class="toast-content">
          <div class="toast-title" *ngIf="toast.title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        
        <button 
          *ngIf="toast.dismissible"
          class="toast-close" 
          (click)="dismiss(toast.id)"
          aria-label="Dismiss notification">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        
        <div class="toast-progress" *ngIf="toast.duration && toast.duration > 0">
          <div 
            class="toast-progress-bar"
            [style.animation-duration.ms]="toast.duration">
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 420px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 18px;
      background: white;
      border-radius: var(--radius-xl, 16px);
      box-shadow: 
        0 10px 25px -5px rgba(0, 0, 0, 0.1),
        0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid var(--slate-100, #f1f5f9);
      position: relative;
      overflow: hidden;
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .toast-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .toast-success .toast-icon {
      color: var(--success-500, #10b981);
    }

    .toast-error .toast-icon {
      color: var(--error-500, #f43f5e);
    }

    .toast-warning .toast-icon {
      color: var(--warning-500, #f59e0b);
    }

    .toast-info .toast-icon {
      color: var(--info-500, #06b6d4);
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      margin-bottom: 4px;
    }

    .toast-message {
      font-size: 14px;
      color: var(--slate-600, #475569);
      line-height: 1.5;
    }

    .toast-close {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--slate-400, #94a3b8);
      cursor: pointer;
      border-radius: var(--radius-md, 8px);
      transition: all 0.15s ease;
      flex-shrink: 0;
      margin: -4px -6px -4px 0;
    }

    .toast-close:hover {
      background: var(--slate-100, #f1f5f9);
      color: var(--slate-600, #475569);
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--slate-100, #f1f5f9);
    }

    .toast-progress-bar {
      height: 100%;
      width: 100%;
      transform-origin: left;
      animation: shrink linear forwards;
    }

    @keyframes shrink {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }

    .toast-success .toast-progress-bar {
      background: var(--success-500, #10b981);
    }

    .toast-error .toast-progress-bar {
      background: var(--error-500, #f43f5e);
    }

    .toast-warning .toast-progress-bar {
      background: var(--warning-500, #f59e0b);
    }

    .toast-info .toast-progress-bar {
      background: var(--info-500, #06b6d4);
    }

    /* Responsive */
    @media (max-width: 480px) {
      .toast-container {
        left: 16px;
        right: 16px;
        bottom: 16px;
        max-width: none;
      }
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
    toasts: Toast[] = [];
    private destroy$ = new Subject<void>();

    constructor(private toastService: ToastService) { }

    ngOnInit(): void {
        this.toastService.toasts
            .pipe(takeUntil(this.destroy$))
            .subscribe(toasts => {
                this.toasts = toasts;
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    trackByToast(index: number, toast: Toast): string {
        return toast.id;
    }

    dismiss(id: string): void {
        this.toastService.dismiss(id);
    }
}
