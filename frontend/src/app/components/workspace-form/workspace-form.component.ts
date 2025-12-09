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

            <!-- Enhanced Color Picker -->
            <div class="form-group">
              <label class="form-label">
                Workspace Color
                <span class="label-hint">Choose a color that represents your workspace</span>
              </label>
              <div class="color-picker-enhanced">
                <!-- Preset Colors -->
                <div class="color-section">
                  <div class="section-title">Preset Colors</div>
                  <div class="color-grid">
                    <div
                      class="color-option-enhanced"
                      *ngFor="let color of colorPresets"
                      [style.background]="color.gradient"
                      [class.selected]="workspaceForm.get('color')?.value === color.value"
                      (click)="selectColor(color.value)"
                      [title]="color.name">
                      <div class="color-preview" [style.background]="color.gradient"></div>
                      <div class="color-name">{{ color.name }}</div>
                      <svg *ngIf="workspaceForm.get('color')?.value === color.value" class="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M13 4L6.5 11L3 7.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <!-- Custom Color -->
                <div class="color-section">
                  <div class="section-title">Custom Color</div>
                  <div class="color-custom-enhanced">
                    <div class="custom-input-wrapper">
                      <input
                        type="color"
                        formControlName="color"
                        class="color-input-native-enhanced"
                        id="custom-color-input"
                        title="Choose custom color"
                      />
                      <label for="custom-color-input" class="custom-color-label">
                        <div class="custom-preview" [style.background]="workspaceForm.get('color')?.value || '#6366f1'"></div>
                        <span class="custom-text">Custom</span>
                      </label>
                    </div>
                    <div class="hex-input-wrapper">
                      <input
                        type="text"
                        class="hex-input"
                        placeholder="#000000"
                        [value]="workspaceForm.get('color')?.value"
                        (input)="updateHexColor($event)"
                        maxlength="7"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Enhanced Icon Picker -->
            <div class="form-group">
              <label class="form-label">
                Workspace Icon
                <span class="label-hint">Select an icon that represents your workspace</span>
              </label>
              <div class="icon-picker-enhanced">
                <!-- Icon Categories -->
                <div class="icon-categories">
                  <button
                    type="button"
                    class="category-tab"
                    *ngFor="let category of iconCategories"
                    [class.active]="activeIconCategory === category.id"
                    (click)="activeIconCategory = category.id">
                    {{ category.name }}
                  </button>
                </div>
                
                <!-- Icon Grid -->
                <div class="icon-grid">
                  <button
                    type="button"
                    class="icon-option-enhanced"
                    *ngFor="let icon of getFilteredIcons()"
                    [class.selected]="workspaceForm.get('icon')?.value === icon"
                    (click)="selectIcon(icon)"
                    [title]="getIconName(icon)">
                    <span class="icon-emoji">{{ icon }}</span>
                    <div class="icon-tooltip">{{ getIconName(icon) }}</div>
                  </button>
                </div>
                
                <!-- Custom Icon Input -->
                <div class="custom-icon-section">
                  <label class="custom-icon-label">
                    <span>Custom Emoji</span>
                    <input
                      type="text"
                      class="custom-icon-input"
                      placeholder="Enter emoji..."
                      [value]="workspaceForm.get('icon')?.value"
                      (input)="updateCustomIcon($event)"
                      maxlength="2"
                    />
                  </label>
                </div>
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

    /* Enhanced Color Picker */
    .color-picker-enhanced {
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-lg, 12px);
      padding: 20px;
      background: var(--slate-50, #f8fafc);
    }

    .color-section {
      margin-bottom: 24px;
    }

    .color-section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--slate-600, #475569);
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 12px;
    }

    .color-option-enhanced {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border: 2px solid transparent;
      border-radius: var(--radius-md, 10px);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      background: white;
    }

    .color-option-enhanced:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .color-option-enhanced.selected {
      border-color: var(--primary-500, #6366f1);
      background: var(--primary-50, #eef2ff);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .color-preview {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md, 8px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .color-name {
      font-size: 11px;
      font-weight: 500;
      color: var(--slate-600, #475569);
      text-align: center;
    }

    .check-icon {
      position: absolute;
      top: 6px;
      right: 6px;
      background: white;
      border-radius: 50%;
      padding: 2px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      animation: checkIn 0.2s ease-out;
    }

    @keyframes checkIn {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .color-custom-enhanced {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .custom-input-wrapper {
      position: relative;
    }

    .color-input-native-enhanced {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .custom-color-label {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border: 2px dashed var(--slate-300, #cbd5e1);
      border-radius: var(--radius-md, 10px);
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }

    .custom-color-label:hover {
      border-color: var(--slate-400, #94a3b8);
      background: var(--slate-50, #f8fafc);
    }

    .custom-preview {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm, 6px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    .custom-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--slate-600, #475569);
    }

    .hex-input-wrapper {
      flex: 1;
      max-width: 120px;
    }

    .hex-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--slate-300, #cbd5e1);
      border-radius: var(--radius-md, 8px);
      font-size: 13px;
      font-weight: 500;
      color: var(--slate-700, #334155);
      background: white;
      transition: all 0.15s ease;
    }

    .hex-input:focus {
      outline: none;
      border-color: var(--primary-500, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    /* Enhanced Icon Picker */
    .icon-picker-enhanced {
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-lg, 12px);
      padding: 20px;
      background: var(--slate-50, #f8fafc);
    }

    .icon-categories {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .category-tab {
      padding: 8px 16px;
      background: white;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      font-size: 13px;
      font-weight: 500;
      color: var(--slate-600, #475569);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .category-tab:hover {
      background: var(--slate-50, #f8fafc);
      color: var(--slate-700, #334155);
    }

    .category-tab.active {
      background: var(--primary-500, #6366f1);
      color: white;
      border-color: var(--primary-500, #6366f1);
    }

    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 8px;
      margin-bottom: 20px;
    }

    .icon-option-enhanced {
      position: relative;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 2px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-md, 10px);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 24px;
    }

    .icon-option-enhanced:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--slate-300, #cbd5e1);
    }

    .icon-option-enhanced.selected {
      background: var(--primary-50, #eef2ff);
      border-color: var(--primary-500, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .icon-emoji {
      font-size: 24px;
      line-height: 1;
    }

    .icon-tooltip {
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--slate-800, #1e293b);
      color: white;
      padding: 4px 8px;
      border-radius: var(--radius-sm, 6px);
      font-size: 11px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 10;
    }

    .icon-option-enhanced:hover .icon-tooltip {
      opacity: 1;
    }

    .custom-icon-section {
      border-top: 1px solid var(--slate-200, #e2e8f0);
      padding-top: 16px;
    }

    .custom-icon-label {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .custom-icon-label span {
      font-size: 13px;
      font-weight: 500;
      color: var(--slate-600, #475569);
    }

    .custom-icon-input {
      padding: 10px 12px;
      border: 1px solid var(--slate-300, #cbd5e1);
      border-radius: var(--radius-md, 8px);
      font-size: 16px;
      color: var(--slate-700, #334155);
      background: white;
      transition: all 0.15s ease;
      max-width: 200px;
    }

    .custom-icon-input:focus {
      outline: none;
      border-color: var(--primary-500, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .label-hint {
      display: block;
      font-size: 12px;
      color: var(--slate-500, #64748b);
      font-weight: 400;
      margin-top: 4px;
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
    { name: 'Green', value: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
    { name: 'Red', value: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
  ];

  iconCategories = [
    { id: 'business', name: 'Business' },
    { id: 'technology', name: 'Technology' },
    { id: 'creative', name: 'Creative' },
    { id: 'misc', name: 'Misc' }
  ];

  iconPresets = {
    business: ['🏢', '💼', '📊', '🏭', '🏪', '🏬', '🏛️', '🏦', '🏨', '🏢'],
    technology: ['💻', '🖥️', '📱', '⚡', '🚀', '🔧', '🛠️', '⚙️', '🔌', '💾'],
    creative: ['🎨', '🎭', '🎪', '🎯', '💡', '🌟', '✨', '🎬', '📸', '🎪'],
    misc: ['🏠', '📁', '📈', '📉', '🔔', '📌', '📍', '🗺️', '⏰', '🔒']
  };

  activeIconCategory = 'business';

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

  getFilteredIcons(): string[] {
    return this.iconPresets[this.activeIconCategory as keyof typeof this.iconPresets] || [];
  }

  getIconName(icon: string): string {
    const iconNames: Record<string, string> = {
      '🏢': 'Office',
      '💼': 'Briefcase',
      '📊': 'Chart',
      '🏭': 'Factory',
      '🏪': 'Shop',
      '🏬': 'Department Store',
      '🏛️': 'Government',
      '🏦': 'Bank',
      '🏨': 'Post Office',
      '💻': 'Laptop',
      '🖥️': 'Desktop',
      '📱': 'Mobile',
      '⚡': 'Lightning',
      '🚀': 'Rocket',
      '🔧': 'Wrench',
      '🛠️': 'Tools',
      '⚙️': 'Settings',
      '🔌': 'Plug',
      '💾': 'Save',
      '🎨': 'Palette',
      '🎭': 'Masks',
      '🎪': 'Circus',
      '🎯': 'Target',
      '💡': 'Idea',
      '🌟': 'Star',
      '✨': 'Sparkles',
      '🎬': 'Film',
      '📸': 'Camera',
      '🏠': 'Home',
      '📁': 'Folder',
      '📈': 'Growth',
      '📉': 'Decline',
      '🔔': 'Bell',
      '📌': 'Pin',
      '📍': 'Location',
      '🗺️': 'Map',
      '⏰': 'Clock',
      '🔒': 'Lock'
    };
    return iconNames[icon] || icon;
  }

  updateHexColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      this.workspaceForm.patchValue({ color: value });
    }
  }

  updateCustomIcon(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow emojis (simplified validation)
    if (value && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(value)) {
      this.workspaceForm.patchValue({ icon: value });
    }
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