import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IWorkspace, IWorkspaceCreateRequest } from '../../interfaces/workspace.interface';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="workspace-form-container">
      <div class="workspace-form-header">
        <h2>{{ isEditMode ? 'Edit Workspace' : 'Create New Workspace' }}</h2>
        <button class="back-btn" (click)="goBack()">
          <span class="icon">←</span>
          Back to Workspaces
        </button>
      </div>
      
      <div class="workspace-form-content" *ngIf="isLoading">
        <div class="loading-spinner">Saving workspace...</div>
      </div>
      
      <div class="workspace-form-content" *ngIf="error">
        <div class="error-message">
          <span class="icon">⚠️</span>
          {{ error }}
        </div>
      </div>
      
      <form [formGroup]="workspaceForm" (ngSubmit)="onSubmit()" *ngIf="!isLoading && !error">
        <div class="form-grid">
          <div class="form-group">
            <label for="name">Workspace Name *</label>
            <input 
              id="name" 
              type="text" 
              formControlName="name" 
              placeholder="Enter workspace name"
              [class.error]="workspaceForm.get('name')?.invalid && workspaceForm.get('name')?.touched">
            />
            <div class="error-message" *ngIf="workspaceForm.get('name')?.invalid && workspaceForm.get('name')?.touched">
              {{ getErrorMessage('name') }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="description" 
              formControlName="description" 
              placeholder="Enter workspace description (optional)"
              rows="4"
            ></textarea>
            <div class="error-message" *ngIf="workspaceForm.get('description')?.invalid && workspaceForm.get('description')?.touched">
              {{ getErrorMessage('description') }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="color">Color</label>
            <div class="color-input-group">
              <input 
                id="color" 
                type="color" 
                formControlName="color" 
                [value]="workspaceForm.get('color')?.value || '#3B82F6'"
              />
              <input 
                type="text" 
                formControlName="color" 
                placeholder="#3B82F6"
                [value]="workspaceForm.get('color')?.value || '#3B82F6'"
              />
            </div>
            <div class="error-message" *ngIf="workspaceForm.get('color')?.invalid && workspaceForm.get('color')?.touched">
              {{ getErrorMessage('color') }}
            </div>
          </div>
          
          <div class="form-group">
            <label for="icon">Icon</label>
            <div class="icon-input-group">
              <input 
                id="icon" 
                type="text" 
                formControlName="icon" 
                placeholder="🏢"
                [value]="workspaceForm.get('icon')?.value || '🏢'"
                maxlength="50"
              />
              <div class="icon-preview" [style.color]="workspaceForm.get('icon')?.value || '#3B82F6'">
                {{ workspaceForm.get('icon')?.value || '🏢' }}
              </div>
            </div>
            <div class="error-message" *ngIf="workspaceForm.get('icon')?.invalid && workspaceForm.get('icon')?.touched">
              {{ getErrorMessage('icon') }}
            </div>
          </div>
          
          <div class="form-group" *ngIf="!isEditMode">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="is_default" 
                formControlName="is_default" 
              />
              Set as default workspace
            </label>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="submit-btn" [disabled]="workspaceForm.invalid || isSubmitting">
            <span class="icon" *ngIf="!isSubmitting">💾</span>
            <span class="icon" *ngIf="isSubmitting">⏳</span>
            {{ isEditMode ? 'Update Workspace' : 'Create Workspace' }}
          </button>
          <button type="button" class="cancel-btn" (click)="goBack()" [disabled]="isSubmitting">
            Cancel
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .workspace-form-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .workspace-form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .workspace-form-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #374151;
    }
    
    .back-btn {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .back-btn:hover {
      background: #e5e7eb;
    }
    
    .workspace-form-content {
      min-height: 200px;
    }
    
    .loading-spinner, .error-message {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .loading-spinner {
      color: #6b7280;
      font-size: 16px;
    }
    
    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 16px;
      border-radius: 8px;
    }
    
    .error-message .icon {
      margin-right: 8px;
    }
    
    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
    }
    
    .form-group label {
      font-weight: 500;
      margin-bottom: 8px;
      color: #374151;
      font-size: 14px;
    }
    
    .form-group input[type="text"],
    .form-group textarea {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s ease;
    }
    
    .form-group input[type="text"]:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .form-group input.error,
    .form-group textarea.error {
      border-color: #dc2626;
    }
    
    .error-message {
      font-size: 12px;
      color: #dc2626;
      margin-top: 4px;
    }
    
    .color-input-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .color-input-group input[type="color"] {
      width: 60px;
      height: 40px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .color-input-group input[type="text"] {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .icon-preview {
      width: 40px;
      height: 40px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      background: white;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 400;
      color: #374151;
      font-size: 14px;
      cursor: pointer;
    }
    
    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
    }
    
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    
    .submit-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
      flex: 1;
      justify-content: center;
    }
    
    .submit-btn:hover:not(:disabled) {
      background: #2563eb;
    }
    
    .submit-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    
    .cancel-btn {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .cancel-btn:hover:not(:disabled) {
      background: #e5e7eb;
    }
    
    .cancel-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
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

  constructor(
    private fb: FormBuilder,
    private workspaceService: WorkspaceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();

    if (this.workspace) {
      this.isEditMode = true;
      this.populateForm(this.workspace);
    }
  }

  initializeForm(): void {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      color: ['#3B82F6', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      icon: ['🏢', Validators.maxLength(50)],
      is_default: [false]
    });
  }

  populateForm(workspace: IWorkspace): void {
    this.workspaceForm.patchValue({
      name: workspace.name,
      description: workspace.description || '',
      color: workspace.color || '#3B82F6',
      icon: workspace.icon || '🏢',
      is_default: workspace.is_default || false
    });
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
        this.error = 'Failed to save workspace';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/workspaces']);
  }

  getCurrentTenantId(): string {
    // This would typically come from a route parameter or service
    // For now, return a placeholder
    return 'current-tenant-id';
  }

  getErrorMessage(fieldName: string): string {
    const field = this.workspaceForm.get(fieldName);
    if (field?.errors) {
      const errors = field.errors;
      if (errors['required']) {
        return 'This field is required';
      }
      if (errors['maxlength']) {
        return `Maximum length exceeded`;
      }
      if (errors['pattern']) {
        return 'Invalid format';
      }
    }
    return '';
  }
}