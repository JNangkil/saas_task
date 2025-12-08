import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IWorkspace, IWorkspaceCreateRequest } from '../../interfaces/workspace.interface';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="workspace-form-container">
      <!-- Back Button -->
      <button class="back-btn" (click)="goBack()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back to Workspaces
      </button>

      <div class="form-layout">
        <!-- Form Section -->
        <div class="form-section">
          <div class="form-header">
            <h1>{{ isEditMode ? 'Edit Workspace' : 'Create Workspace' }}</h1>
            <p>{{ isEditMode ? 'Update your workspace settings and preferences' : 'Set up a new workspace for your team' }}</p>
          </div>

          <!-- Error Message -->
          <div class="error-alert" *ngIf="error">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5"/>
              <path d="M9 5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="9" cy="12" r="1" fill="currentColor"/>
            </svg>
            {{ error }}
            <button class="dismiss-btn" (click)="error = null">×</button>
          </div>

          <form [formGroup]="workspaceForm" (ngSubmit)="onSubmit()" class="form-content">
            <!-- Workspace Name -->
            <div class="form-group">
              <label for="name" class="form-label">
                Workspace Name
                <span class="required">*</span>
              </label>
              <input 
                id="name" 
                type="text" 
                formControlName="name" 
                placeholder="e.g., Marketing Team, Project Alpha"
                class="form-input"
                [class.error]="workspaceForm.get('name')?.invalid && workspaceForm.get('name')?.touched"
              />
              <div class="form-error" *ngIf="workspaceForm.get('name')?.invalid && workspaceForm.get('name')?.touched">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M7 4V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="7" cy="9.5" r="0.75" fill="currentColor"/>
                </svg>
                {{ getErrorMessage('name') }}
              </div>
            </div>

            <!-- Description -->
            <div class="form-group">
              <label for="description" class="form-label">Description</label>
              <textarea 
                id="description" 
                formControlName="description" 
                placeholder="What is this workspace for? (optional)"
                rows="3"
                class="form-textarea"
              ></textarea>
            </div>

            <!-- Color Picker -->
            <div class="form-group">
              <label class="form-label">Workspace Color</label>
              <div class="color-picker">
                <div 
                  class="color-option"
                  *ngFor="let color of colorPresets"
                  [style.background]="color.gradient"
                  [class.selected]="workspaceForm.get('color')?.value === color.value"
                  (click)="selectColor(color.value)"
                  [title]="color.name">
                  <svg *ngIf="workspaceForm.get('color')?.value === color.value" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13 4L6.5 11L3 7.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="color-custom">
                  <input 
                    type="color" 
                    formControlName="color"
                    class="color-input-native"
                    title="Custom color"
                  />
                  <span class="custom-label">Custom</span>
                </div>
              </div>
            </div>

            <!-- Icon Picker -->
            <div class="form-group">
              <label class="form-label">Workspace Icon</label>
              <div class="icon-picker">
                <button
                  type="button"
                  class="icon-option"
                  *ngFor="let icon of iconPresets"
                  [class.selected]="workspaceForm.get('icon')?.value === icon"
                  (click)="selectIcon(icon)">
                  {{ icon }}
                </button>
              </div>
            </div>

            <!-- Default Workspace Toggle -->
            <div class="form-group toggle-group" *ngIf="!isEditMode">
              <label class="toggle-label">
                <div class="toggle-info">
                  <span class="toggle-title">Set as default workspace</span>
                  <span class="toggle-description">This workspace will be selected automatically when you sign in</span>
                </div>
                <div class="toggle-switch" [class.active]="workspaceForm.get('is_default')?.value">
                  <input type="checkbox" formControlName="is_default" />
                  <span class="toggle-slider"></span>
                </div>
              </label>
            </div>

            <!-- Submit Button -->
            <div class="form-actions">
              <button 
                type="submit" 
                class="submit-btn"
                [disabled]="workspaceForm.invalid || isSubmitting">
                <span class="btn-content" *ngIf="!isSubmitting">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15 6L7 14L3 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  {{ isEditMode ? 'Save Changes' : 'Create Workspace' }}
                </span>
                <span class="btn-loading" *ngIf="isSubmitting">
                  <div class="spinner"></div>
                  {{ isEditMode ? 'Saving...' : 'Creating...' }}
                </span>
              </button>
              <button type="button" class="cancel-btn" (click)="goBack()" [disabled]="isSubmitting">
                Cancel
              </button>
            </div>
          </form>
        </div>

        <!-- Preview Section -->
        <div class="preview-section">
          <div class="preview-header">
            <span class="preview-label">Preview</span>
          </div>
          <div class="preview-card">
            <div class="preview-card-header">
              <div 
                class="preview-icon"
                [style.background]="getPreviewBackground()">
                {{ workspaceForm.get('icon')?.value || '🏢' }}
              </div>
              <div class="preview-info">
                <h3 class="preview-title">{{ workspaceForm.get('name')?.value || 'Workspace Name' }}</h3>
                <span class="preview-status" *ngIf="workspaceForm.get('is_default')?.value">Default</span>
              </div>
            </div>
            <p class="preview-description">
              {{ workspaceForm.get('description')?.value || 'No description provided' }}
            </p>
            <div class="preview-footer">
              <div class="preview-meta">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="5" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M1 12C1 9.79 2.79 8 5 8C7.21 8 9 9.79 9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                1 member
              </div>
              <span class="preview-role">Owner</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workspace-form-container {
      padding: 8px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: transparent;
      border: none;
      color: var(--slate-600, #475569);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border-radius: var(--radius-md, 8px);
      transition: all 0.15s ease;
      margin-bottom: 24px;
    }

    .back-btn:hover {
      background: var(--slate-100, #f1f5f9);
      color: var(--slate-800, #1e293b);
    }

    .form-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 40px;
      align-items: start;
    }

    /* Form Section */
    .form-section {
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      padding: 32px;
    }

    .form-header {
      margin-bottom: 32px;
    }

    .form-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: var(--slate-800, #1e293b);
    }

    .form-header p {
      margin: 8px 0 0;
      font-size: 15px;
      color: var(--slate-500, #64748b);
    }

    .error-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: var(--error-50, #fff1f2);
      border: 1px solid var(--error-100, #ffe4e6);
      border-radius: var(--radius-md, 8px);
      color: var(--error-600, #e11d48);
      font-size: 14px;
      margin-bottom: 24px;
    }

    .dismiss-btn {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 18px;
      color: var(--error-400);
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
    }

    .form-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--slate-700, #334155);
      margin-bottom: 8px;
    }

    .required {
      color: var(--error-500, #f43f5e);
      margin-left: 2px;
    }

    .form-input,
    .form-textarea {
      padding: 12px 14px;
      font-size: 15px;
      font-family: inherit;
      color: var(--slate-800, #1e293b);
      background: white;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      transition: all 0.15s ease;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: var(--primary-500, #6366f1);
      box-shadow: 0 0 0 3px var(--primary-100, #e0e7ff);
    }

    .form-input.error,
    .form-textarea.error {
      border-color: var(--error-500, #f43f5e);
    }

    .form-input.error:focus,
    .form-textarea.error:focus {
      box-shadow: 0 0 0 3px var(--error-100, #ffe4e6);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-error {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--error-500, #f43f5e);
      margin-top: 6px;
    }

    /* Color Picker */
    .color-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .color-option {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md, 8px);
      border: 3px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .color-option:hover {
      transform: scale(1.1);
    }

    .color-option.selected {
      border-color: var(--slate-800, #1e293b);
      box-shadow: 0 0 0 2px white, 0 0 0 4px var(--slate-300, #cbd5e1);
    }

    .color-custom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .color-input-native {
      width: 40px;
      height: 40px;
      border: 2px dashed var(--slate-300, #cbd5e1);
      border-radius: var(--radius-md, 8px);
      padding: 2px;
      cursor: pointer;
      background: white;
    }

    .color-input-native::-webkit-color-swatch {
      border: none;
      border-radius: 4px;
    }

    .custom-label {
      font-size: 10px;
      color: var(--slate-500, #64748b);
    }

    /* Icon Picker */
    .icon-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .icon-option {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      background: var(--slate-50, #f8fafc);
      border: 2px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .icon-option:hover {
      background: var(--slate-100, #f1f5f9);
      transform: scale(1.05);
    }

    .icon-option.selected {
      background: var(--primary-50, #eef2ff);
      border-color: var(--primary-500, #6366f1);
    }

    /* Toggle */
    .toggle-group {
      padding: 16px;
      background: var(--slate-50, #f8fafc);
      border-radius: var(--radius-lg, 12px);
    }

    .toggle-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }

    .toggle-info {
      display: flex;
      flex-direction: column;
    }

    .toggle-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--slate-700, #334155);
    }

    .toggle-description {
      font-size: 13px;
      color: var(--slate-500, #64748b);
      margin-top: 2px;
    }

    .toggle-switch {
      position: relative;
      width: 48px;
      height: 26px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      inset: 0;
      background: var(--slate-300, #cbd5e1);
      border-radius: 13px;
      transition: all 0.2s ease;
    }

    .toggle-slider::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 3px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .toggle-switch.active .toggle-slider {
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
    }

    .toggle-switch.active .toggle-slider::before {
      transform: translateX(22px);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .submit-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 24px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md, 8px);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-content,
    .btn-loading {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .cancel-btn {
      padding: 14px 24px;
      background: white;
      color: var(--slate-600, #475569);
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .cancel-btn:hover:not(:disabled) {
      background: var(--slate-50, #f8fafc);
      border-color: var(--slate-300, #cbd5e1);
    }

    .cancel-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Preview Section */
    .preview-section {
      position: sticky;
      top: 24px;
    }

    .preview-header {
      margin-bottom: 12px;
    }

    .preview-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500, #64748b);
    }

    .preview-card {
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      padding: 24px;
      box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));
    }

    .preview-card-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 16px;
    }

    .preview-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg, 12px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .preview-info {
      flex: 1;
    }

    .preview-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
    }

    .preview-status {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      color: var(--success-600, #059669);
      background: var(--success-50, #ecfdf5);
      padding: 2px 8px;
      border-radius: var(--radius-sm, 6px);
      margin-top: 4px;
    }

    .preview-description {
      margin: 0 0 16px;
      font-size: 14px;
      color: var(--slate-500, #64748b);
      line-height: 1.6;
    }

    .preview-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .preview-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--slate-500, #64748b);
    }

    .preview-role {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: var(--radius-full, 9999px);
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: white;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .form-layout {
        grid-template-columns: 1fr;
      }

      .preview-section {
        position: static;
        order: -1;
      }
    }
  `]
})
export class WorkspaceFormComponent implements OnInit {
  @Input() workspace: IWorkspace | null = null;
  @Output() workspaceSaved = new EventEmitter<IWorkspace>();

  workspaceForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;

  colorPresets = [
    { name: 'Indigo', value: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
    { name: 'Violet', value: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
    { name: 'Pink', value: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' },
    { name: 'Rose', value: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' },
    { name: 'Orange', value: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
    { name: 'Amber', value: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    { name: 'Emerald', value: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { name: 'Teal', value: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' },
    { name: 'Cyan', value: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' },
    { name: 'Blue', value: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  ];

  iconPresets = ['🏢', '💼', '📊', '🚀', '⚡', '🎯', '📁', '🏠', '🌟', '💡', '🔧', '📱', '🎨', '📈', '🛠️'];

  constructor(
    private fb: FormBuilder,
    private workspaceService: WorkspaceService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.initializeForm();

    // Check for edit mode from route
    const workspaceId = this.route.snapshot.paramMap.get('id');
    if (workspaceId) {
      this.isEditMode = true;
      this.loadWorkspace(workspaceId);
    } else if (this.workspace) {
      this.isEditMode = true;
      this.populateForm(this.workspace);
    }
  }

  initializeForm(): void {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      color: ['#6366f1'],
      icon: ['🏢'],
      is_default: [false]
    });
  }

  loadWorkspace(id: string): void {
    this.isLoading = true;
    this.workspaceService.getWorkspace(id).subscribe({
      next: (workspace) => {
        this.workspace = workspace;
        this.populateForm(workspace);
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load workspace';
        this.isLoading = false;
      }
    });
  }

  populateForm(workspace: IWorkspace): void {
    this.workspaceForm.patchValue({
      name: workspace.name,
      description: workspace.description || '',
      color: workspace.color || '#6366f1',
      icon: workspace.icon || '🏢',
      is_default: workspace.is_default || false
    });
  }

  selectColor(color: string): void {
    this.workspaceForm.patchValue({ color });
  }

  selectIcon(icon: string): void {
    this.workspaceForm.patchValue({ icon });
  }

  onSubmit(): void {
    if (this.workspaceForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const formData = this.workspaceForm.value as IWorkspaceCreateRequest;

    const operation = this.isEditMode
      ? this.workspaceService.updateWorkspace(this.workspace!.id, formData)
      : this.workspaceService.createWorkspace(this.getCurrentTenantId(), formData);

    operation.subscribe({
      next: (savedWorkspace: IWorkspace) => {
        this.isSubmitting = false;
        this.workspaceSaved.emit(savedWorkspace);
        this.router.navigate(['/workspaces']);
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.error = error?.message || 'Failed to save workspace. Please try again.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/workspaces']);
  }

  getCurrentTenantId(): string {
    return 'current-tenant-id';
  }

  getPreviewBackground(): string {
    const color = this.workspaceForm.get('color')?.value || '#6366f1';
    return `linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 15)} 100%)`;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.workspaceForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'This field is required';
      }
      if (field.errors['maxlength']) {
        return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
      }
    }
    return '';
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}