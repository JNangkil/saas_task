import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxRequired?: boolean;
  details?: {
    title: string;
    items: string[];
  };
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" [class.visible]="isVisible" (click)="onOverlayClick($event)">
      <div class="dialog-container" [class.visible]="isVisible" [ngClass]="typeClass">
        <div class="dialog-header">
          <div class="dialog-icon">
            <svg *ngIf="type === 'danger'" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg *ngIf="type === 'warning'" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/>
              <path d="M12 9V13M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg *ngIf="type === 'info'" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 16V12M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3 class="dialog-title">{{ title }}</h3>
        </div>

        <div class="dialog-body">
          <p class="dialog-message" [innerHTML]="message"></p>
          
          <div *ngIf="showCheckbox" class="checkbox-section">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                class="checkbox-input"
                [(ngModel)]="checkboxChecked"
                [disabled]="isLoading"
              />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">{{ checkboxLabel }}</span>
            </label>
          </div>

          <div *ngIf="details" class="dialog-details">
            <div class="details-content">
              <h4 class="details-title">{{ details.title }}</h4>
              <ul class="details-list">
                <li *ngFor="let detail of details.items" class="details-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M5.5 8L7.5 10L10.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ detail }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button 
            class="btn-cancel"
            (click)="onCancel()"
            [disabled]="isLoading">
            {{ cancelText || 'Cancel' }}
          </button>
          <button 
            class="btn-confirm"
            [class]="confirmButtonClass"
            (click)="onConfirm()"
            [disabled]="isLoading || (showCheckbox && checkboxRequired && !checkboxChecked)">
            <span *ngIf="!isLoading" class="btn-content">
              <svg *ngIf="type === 'danger'" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4L8 10L14 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ confirmText || 'Confirm' }}
            </span>
            <span *ngIf="isLoading" class="btn-loading">
              <div class="spinner"></div>
              {{ loadingText || 'Processing...' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 20px;
    }

    .dialog-overlay.visible {
      opacity: 1;
      visibility: visible;
    }

    .dialog-container {
      background: white;
      border-radius: var(--radius-xl, 16px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-width: 480px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      transform: scale(0.9) translateY(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid var(--slate-100, #f1f5f9);
    }

    .dialog-container.visible {
      transform: scale(1) translateY(0);
    }

    .dialog-container.danger {
      border-left: 4px solid var(--error-500, #f43f5e);
    }

    .dialog-container.warning {
      border-left: 4px solid var(--warning-500, #f59e0b);
    }

    .dialog-container.info {
      border-left: 4px solid var(--info-500, #3b82f6);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px 24px 20px;
      border-bottom: 1px solid var(--slate-100, #f1f5f9);
    }

    .dialog-icon {
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg, 12px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-container.danger .dialog-icon {
      background: var(--error-50, #fff1f2);
      color: var(--error-600, #e11d48);
    }

    .dialog-container.warning .dialog-icon {
      background: var(--warning-50, #fffbeb);
      color: var(--warning-600, #d97706);
    }

    .dialog-container.info .dialog-icon {
      background: var(--info-50, #eff6ff);
      color: var(--info-600, #2563eb);
    }

    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      line-height: 1.3;
    }

    .dialog-body {
      padding: 20px 24px;
    }

    .dialog-message {
      margin: 0 0 16px;
      font-size: 15px;
      color: var(--slate-600, #475569);
      line-height: 1.6;
    }

    .checkbox-section {
      margin: 16px 0;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      font-size: 14px;
      color: var(--slate-700, #334155);
      line-height: 1.5;
    }

    .checkbox-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .checkbox-custom {
      position: relative;
      width: 20px;
      height: 20px;
      border: 2px solid var(--slate-300, #cbd5e1);
      border-radius: var(--radius-sm, 6px);
      flex-shrink: 0;
      margin-top: 2px;
      transition: all 0.2s ease;
    }

    .checkbox-input:checked + .checkbox-custom {
      background: var(--primary-500, #6366f1);
      border-color: var(--primary-500, #6366f1);
    }

    .checkbox-input:checked + .checkbox-custom::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 6px;
      width: 6px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .checkbox-text {
      flex: 1;
    }

    .dialog-details {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--slate-100, #f1f5f9);
    }

    .details-content {
      background: var(--slate-50, #f8fafc);
      border-radius: var(--radius-lg, 12px);
      padding: 16px;
    }

    .details-title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--slate-700, #334155);
    }

    .details-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .details-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      font-size: 13px;
      color: var(--slate-600, #475569);
      line-height: 1.5;
    }

    .details-item svg {
      color: var(--success-500, #22c55e);
      flex-shrink: 0;
    }

    .dialog-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid var(--slate-100, #f1f5f9);
      background: var(--slate-50, #f8fafc);
    }

    .btn-cancel,
    .btn-confirm {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: var(--radius-md, 10px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      white-space: nowrap;
    }

    .btn-cancel {
      background: white;
      color: var(--slate-600, #475569);
      border: 1px solid var(--slate-200, #e2e8f0);
    }

    .btn-cancel:hover:not(:disabled) {
      background: var(--slate-50, #f8fafc);
      border-color: var(--slate-300, #cbd5e1);
    }

    .btn-confirm {
      background: var(--primary-500, #6366f1);
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .btn-confirm:hover:not(:disabled) {
      background: var(--primary-600, #4f46e5);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      transform: translateY(-1px);
    }

    .btn-confirm.danger {
      background: var(--error-500, #f43f5e);
      box-shadow: 0 2px 8px rgba(244, 63, 94, 0.3);
    }

    .btn-confirm.danger:hover:not(:disabled) {
      background: var(--error-600, #e11d48);
      box-shadow: 0 4px 12px rgba(244, 63, 94, 0.4);
    }

    .btn-confirm.warning {
      background: var(--warning-500, #f59e0b);
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    }

    .btn-confirm.warning:hover:not(:disabled) {
      background: var(--warning-600, #d97706);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    }

    .btn-cancel:disabled,
    .btn-confirm:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .btn-content,
    .btn-loading {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive Design */
    @media (max-width: 640px) {
      .dialog-overlay {
        padding: 16px;
      }

      .dialog-container {
        max-width: 100%;
      }

      .dialog-header {
        padding: 20px 20px 16px;
      }

      .dialog-icon {
        width: 40px;
        height: 40px;
      }

      .dialog-title {
        font-size: 18px;
      }

      .dialog-body {
        padding: 16px 20px;
      }

      .dialog-message {
        font-size: 14px;
      }

      .dialog-footer {
        padding: 16px 20px;
        flex-direction: column-reverse;
      }

      .btn-cancel,
      .btn-confirm {
        width: 100%;
        justify-content: center;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .dialog-container {
        border-width: 2px;
      }

      .btn-cancel,
      .btn-confirm {
        border-width: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .dialog-overlay,
      .dialog-container,
      .btn-cancel,
      .btn-confirm {
        transition: none;
      }

      .spinner {
        animation: none;
      }
    }
  `]
})
export class ConfirmationDialogComponent {
  @Input() isVisible = false;
  @Input() data: ConfirmationDialogData | null = null;
  @Input() isLoading = false;
  @Input() loadingText = '';
  @Input() details: { title: string; items: string[] } | null = null;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  checkboxChecked = false;

  get title(): string {
    return this.data?.title || 'Confirm Action';
  }

  get message(): string {
    return this.data?.message || 'Are you sure you want to proceed?';
  }

  get confirmText(): string {
    return this.data?.confirmText || 'Confirm';
  }

  get cancelText(): string {
    return this.data?.cancelText || 'Cancel';
  }

  get type(): 'danger' | 'warning' | 'info' {
    return this.data?.type || 'info';
  }

  get typeClass(): string {
    return this.type;
  }

  get confirmButtonClass(): string {
    return this.type;
  }

  get showCheckbox(): boolean {
    return this.data?.showCheckbox || false;
  }

  get checkboxLabel(): string {
    return this.data?.checkboxLabel || 'I understand the consequences';
  }

  get checkboxRequired(): boolean {
    return this.data?.checkboxRequired || false;
  }

  @HostListener('keydown.escape')
  onEscapeKey(): void {
    if (this.isVisible) {
      this.onCancel();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  onConfirm(): void {
    if (!this.isLoading && (!this.showCheckbox || !this.checkboxRequired || this.checkboxChecked)) {
      this.confirm.emit();
    }
  }

  onCancel(): void {
    if (!this.isLoading) {
      this.cancel.emit();
      this.checkboxChecked = false; // Reset checkbox
    }
  }
}