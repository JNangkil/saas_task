import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { IWorkspace } from '../../interfaces/workspace.interface';
import { IWorkspaceMember } from '../../interfaces/workspace-member.interface';
import { WorkspaceService } from '../../services/workspace.service';
import { WorkspaceMemberService } from '../../services/workspace-member.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-workspace-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmationDialogComponent
  ],
  template: `
    <div class="workspace-settings" *ngIf="workspace">
      <!-- Header -->
      <div class="settings-header">
        <button class="back-btn" (click)="goBack()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Back to Workspaces
        </button>
        <div class="header-content">
          <h1 class="page-title">{{ workspace.name }} Settings</h1>
          <p class="page-subtitle">Manage workspace details, members, and permissions</p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button
          class="tab-button"
          [class.active]="activeTab === 'general'"
          (click)="switchTab('general')">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3V15M3 9H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          General
        </button>
        <button
          class="tab-button"
          [class.active]="activeTab === 'members'"
          (click)="switchTab('members')">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M1 16C1 12.6863 3.68629 10 7 10C10.3137 10 13 12.6863 13 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="13" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M17 16C17 13.7909 15.2091 12 13 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Members
        </button>
        <button
          class="tab-button"
          [class.active]="activeTab === 'permissions'"
          (click)="switchTab('permissions')">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 7H11M7 11H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Permissions
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- General Settings Tab -->
        <div *ngIf="activeTab === 'general'" class="tab-panel animate-fade-in">
          <div class="settings-section">
            <div class="section-header">
              <h2 class="section-title">Workspace Details</h2>
              <p class="section-description">Update basic workspace information and appearance</p>
            </div>

            <div class="settings-form">
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

              <form [formGroup]="workspaceForm" (ngSubmit)="saveWorkspaceSettings()" class="form-content">
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

                <!-- Color and Icon -->
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label">Workspace Color</label>
                    <div class="color-picker">
                      <div 
                        class="color-option"
                        *ngFor="let color of colorPresets"
                        [style.background]="color.gradient"
                        [class.selected]="workspaceForm.get('color')?.value === color.value"
                        (click)="selectColor(color.value)"
                        [title]="color.name">
                        <div class="color-preview" [style.background]="color.gradient"></div>
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
                  <div class="form-group flex-1">
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
                </div>

                <!-- Status Settings -->
                <div class="form-group">
                  <label class="form-label">Workspace Status</label>
                  <div class="status-options">
                    <label class="status-option">
                      <input type="radio" formControlName="status" value="active" />
                      <div class="status-indicator active"></div>
                      <span class="status-label">Active</span>
                      <span class="status-description">Workspace is fully operational</span>
                    </label>
                    <label class="status-option">
                      <input type="radio" formControlName="status" value="inactive" />
                      <div class="status-indicator inactive"></div>
                      <span class="status-label">Inactive</span>
                      <span class="status-description">Temporarily disabled</span>
                    </label>
                    <label class="status-option">
                      <input type="radio" formControlName="status" value="disabled" />
                      <div class="status-indicator disabled"></div>
                      <span class="status-label">Disabled</span>
                      <span class="status-description">Permanently disabled</span>
                    </label>
                  </div>
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
                      Save Changes
                    </span>
                    <span class="btn-loading" *ngIf="isSubmitting">
                      <div class="spinner"></div>
                      Saving...
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Members Tab -->
        <div *ngIf="activeTab === 'members'" class="tab-panel animate-fade-in">
          <div class="settings-section">
            <div class="section-header">
              <h2 class="section-title">Workspace Members</h2>
              <p class="section-description">Manage team members and their permissions</p>
              <button class="invite-btn" (click)="openInviteModal()">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Invite Members
              </button>
            </div>

            <!-- Members List -->
            <div class="members-list">
              <div class="members-header">
                <div class="member-info">Member</div>
                <div class="member-role">Role</div>
                <div class="member-joined">Joined</div>
                <div class="member-actions">Actions</div>
              </div>
              
              <div class="member-item" *ngFor="let member of members; trackBy: trackMember">
                <div class="member-avatar">
                  {{ getInitials(member.name) }}
                </div>
                <div class="member-info">
                  <div class="member-name">{{ member.name }}</div>
                  <div class="member-email">{{ member.email }}</div>
                </div>
                <div class="member-role">
                  <span class="role-badge" [class]="'badge-' + member.role">
                    {{ formatRole(member.role) }}
                  </span>
                </div>
                <div class="member-joined">{{ formatDate(member.joined_at) }}</div>
                <div class="member-actions">
                  <button 
                    class="action-btn"
                    [disabled]="!canManageMembers || member.role === 'owner'"
                    (click)="editMemberRole(member)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    class="action-btn danger"
                    [disabled]="!canManageMembers || member.role === 'owner'"
                    (click)="removeMember(member)">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3H11M5 3V1M9 3V1M4 7H10M5 7V11M9 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Permissions Tab -->
        <div *ngIf="activeTab === 'permissions'" class="tab-panel animate-fade-in">
          <div class="settings-section">
            <div class="section-header">
              <h2 class="section-title">Workspace Permissions</h2>
              <p class="section-description">Configure what members can do in this workspace</p>
            </div>

            <div class="permissions-grid">
              <div class="permission-group">
                <h3 class="permission-title">General Permissions</h3>
                <div class="permission-items">
                  <label class="permission-item">
                    <input type="checkbox" formControlName="canCreateTasks" />
                    <span class="permission-label">Create tasks</span>
                    <span class="permission-description">Members can create new tasks</span>
                  </label>
                  <label class="permission-item">
                    <input type="checkbox" formControlName="canEditTasks" />
                    <span class="permission-label">Edit tasks</span>
                    <span class="permission-description">Members can edit existing tasks</span>
                  </label>
                  <label class="permission-item">
                    <input type="checkbox" formControlName="canDeleteTasks" />
                    <span class="permission-label">Delete tasks</span>
                    <span class="permission-description">Members can delete tasks</span>
                  </label>
                </div>
              </div>

              <div class="permission-group">
                <h3 class="permission-title">Board Management</h3>
                <div class="permission-items">
                  <label class="permission-item">
                    <input type="checkbox" formControlName="canManageBoards" />
                    <span class="permission-label">Manage boards</span>
                    <span class="permission-description">Members can create and manage boards</span>
                  </label>
                  <label class="permission-item">
                    <input type="checkbox" formControlName="canInviteMembers" />
                    <span class="permission-label">Invite members</span>
                    <span class="permission-description">Members can invite new people to the workspace</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button 
                class="submit-btn"
                (click)="savePermissions()"
                [disabled]="isSubmitting">
                <span class="btn-content" *ngIf="!isSubmitting">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15 6L7 14L3 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Save Permissions
                </span>
                <span class="btn-loading" *ngIf="isSubmitting">
                  <div class="spinner"></div>
                  Saving...
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirmation Dialog -->
      <app-confirmation-dialog
        [isVisible]="showConfirmDialog"
        [data]="confirmDialogData"
        [isLoading]="isSubmitting"
        (confirm)="onConfirmAction()"
        (cancel)="onCancelAction()">
      </app-confirmation-dialog>
    </div>
  `,
  styles: [`
    .workspace-settings {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
      min-height: 100vh;
      background: var(--slate-50, #f8fafc);
    }

    /* Header */
    .settings-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--slate-200, #e2e8f0);
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: transparent;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      color: var(--slate-600, #475569);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      background: var(--slate-50, #f8fafc);
      border-color: var(--slate-300, #cbd5e1);
    }

    .header-content {
      flex: 1;
    }

    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--slate-800, #1e293b);
      line-height: 1.2;
    }

    .page-subtitle {
      margin: 8px 0 0;
      font-size: 16px;
      color: var(--slate-500, #64748b);
      line-height: 1.5;
    }

    /* Tab Navigation */
    .tab-navigation {
      display: flex;
      gap: 8px;
      margin-bottom: 32px;
      background: white;
      padding: 6px;
      border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1));
      border: 1px solid var(--slate-100, #f1f5f9);
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: none;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--slate-500, #64748b);
      cursor: pointer;
      border-radius: var(--radius-lg, 12px);
      transition: all 0.2s ease;
    }

    .tab-button:hover {
      color: var(--slate-700, #334155);
      background: var(--slate-50, #f8fafc);
    }

    .tab-button.active {
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .tab-button svg {
      opacity: 0.8;
    }

    .tab-button.active svg {
      opacity: 1;
    }

    /* Tab Content */
    .tab-content {
      min-height: 600px;
    }

    .tab-panel {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Settings Section */
    .settings-section {
      background: white;
      border-radius: var(--radius-xl, 16px);
      padding: 32px;
      box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));
    }

    .section-header {
      margin-bottom: 32px;
    }

    .section-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      margin-bottom: 8px;
    }

    .section-description {
      margin: 0;
      font-size: 15px;
      color: var(--slate-500, #64748b);
      line-height: 1.6;
    }

    /* Form Styles */
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
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

    /* Color Picker */
    .color-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .color-option {
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md, 8px);
      border: 3px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .color-option:hover {
      transform: scale(1.05);
    }

    .color-option.selected {
      border-color: var(--slate-300, #cbd5e1);
      box-shadow: 0 0 0 2px white, 0 0 0 4px var(--slate-200, #e2e8f0);
    }

    .color-preview {
      width: 100%;
      height: 100%;
      border-radius: var(--radius-sm, 6px);
    }

    .color-custom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .color-input-native {
      width: 48px;
      height: 48px;
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
      width: 48px;
      height: 48px;
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

    /* Status Options */
    .status-options {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .status-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-lg, 12px);
      cursor: pointer;
      transition: all 0.15s ease;
      flex: 1;
      min-width: 200px;
    }

    .status-option:hover {
      border-color: var(--slate-300, #cbd5e1);
      background: var(--slate-50, #f8fafc);
    }

    .status-option input[type="radio"]:checked + .status-indicator {
      box-shadow: 0 0 0 2px var(--primary-500, #6366f1);
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--slate-300, #cbd5e1);
      transition: all 0.15s ease;
    }

    .status-indicator.active {
      background: var(--success-500, #22c55e);
      border-color: var(--success-500, #22c55e);
    }

    .status-indicator.inactive {
      background: var(--warning-500, #f59e0b);
      border-color: var(--warning-500, #f59e0b);
    }

    .status-indicator.disabled {
      background: var(--slate-400, #94a3b8);
      border-color: var(--slate-400, #94a3b8);
    }

    .status-label {
      font-weight: 600;
      color: var(--slate-700, #334155);
    }

    .status-description {
      font-size: 13px;
      color: var(--slate-500, #64748b);
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

    /* Members List */
    .members-list {
      margin-top: 24px;
    }

    .members-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 120px;
      gap: 16px;
      padding: 16px;
      background: var(--slate-50, #f8fafc);
      border-radius: var(--radius-lg, 12px);
      font-weight: 600;
      font-size: 13px;
      color: var(--slate-600, #475569);
      margin-bottom: 8px;
    }

    .member-item {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 120px;
      gap: 16px;
      padding: 16px;
      border-bottom: 1px solid var(--slate-100, #f1f5f9);
      align-items: center;
    }

    .member-item:last-child {
      border-bottom: none;
    }

    .member-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
    }

    .member-info {
      display: flex;
      flex-direction: column;
    }

    .member-name {
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      font-size: 14px;
    }

    .member-email {
      font-size: 13px;
      color: var(--slate-500, #64748b);
    }

    .member-role {
      display: flex;
      align-items: center;
    }

    .member-joined {
      font-size: 13px;
      color: var(--slate-500, #64748b);
    }

    .member-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 8px 12px;
      background: transparent;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      color: var(--slate-600, #475569);
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 13px;
    }

    .action-btn:hover:not(:disabled) {
      background: var(--slate-50, #f8fafc);
      border-color: var(--slate-300, #cbd5e1);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.danger {
      color: var(--error-600, #e11d48);
      border-color: var(--error-200, #ffe4e6);
    }

    .action-btn.danger:hover:not(:disabled) {
      background: var(--error-50, #fff1f2);
      border-color: var(--error-300, #fca5a5);
    }

    .role-badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 4px 8px;
      border-radius: var(--radius-full, 9999px);
      letter-spacing: 0.02em;
    }

    .badge-owner {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: white;
    }

    .badge-admin {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: white;
    }

    .badge-member {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
    }

    .badge-viewer {
      background: linear-gradient(135deg, #64748b 0%, #475569 100%);
      color: white;
    }

    /* Permissions */
    .permissions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }

    .permission-group {
      background: var(--slate-50, #f8fafc);
      border-radius: var(--radius-lg, 12px);
      padding: 24px;
    }

    .permission-title {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 600;
      color: var(--slate-700, #334155);
    }

    .permission-items {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .permission-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
    }

    .permission-item input[type="checkbox"] {
      width: 20px;
      height: 20px;
      margin: 0;
      cursor: pointer;
    }

    .permission-label {
      font-weight: 500;
      color: var(--slate-700, #334155);
      margin-bottom: 4px;
    }

    .permission-description {
      font-size: 13px;
      color: var(--slate-500, #64748b);
      line-height: 1.4;
    }

    .invite-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md, 8px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    .invite-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .workspace-settings {
        padding: 16px;
      }

      .settings-header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }

      .tab-navigation {
        flex-wrap: wrap;
      }

      .tab-button {
        flex: 1;
        min-width: 120px;
        justify-content: center;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .status-options {
        flex-direction: column;
      }

      .status-option {
        min-width: auto;
      }

      .members-header {
        grid-template-columns: 1fr;
        gap: 8px;
        padding: 12px;
      }

      .member-item {
        grid-template-columns: 1fr;
        gap: 12px;
        padding: 12px;
      }

      .member-actions {
        flex-direction: column;
        gap: 8px;
      }

      .permissions-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }
  `]
})
export class WorkspaceSettingsComponent implements OnInit, OnDestroy {
  @Input() workspaceId: string | null = null;
  @Output() workspaceUpdated = new EventEmitter<IWorkspace>();

  workspace: IWorkspace | null = null;
  members: IWorkspaceMember[] = [];
  activeTab: 'general' | 'members' | 'permissions' = 'general';
  isSubmitting = false;
  error: string | null = null;
  showConfirmDialog = false;
  confirmDialogData: ConfirmationDialogData | null = null;
  canManageMembers = false;
  memberToRemove: IWorkspaceMember | null = null;
  isLoadingMembers = false;

  workspaceForm!: FormGroup;
  permissionsForm!: FormGroup;

  colorPresets = [
    { name: 'Indigo', value: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
    { name: 'Violet', value: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
    { name: 'Pink', value: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' },
    { name: 'Rose', value: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' },
    { name: 'Orange', value: '#f97316', gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' },
    { name: 'Emerald', value: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { name: 'Teal', value: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' },
    { name: 'Blue', value: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
  ];

  iconPresets = ['🏢', '💼', '📊', '🚀', '⚡', '🎯', '📁', '🏠', '🌟', '💡', '🔧', '📱', '🎨', '📈', '🛠️'];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private workspaceService: WorkspaceService,
    private workspaceMemberService: WorkspaceMemberService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadWorkspace();
    this.loadMembers();
    this.checkPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.workspaceForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      color: ['#6366f1'],
      icon: ['🏢'],
      status: ['active']
    });

    this.permissionsForm = this.fb.group({
      canCreateTasks: [true],
      canEditTasks: [true],
      canDeleteTasks: [true],
      canManageBoards: [true],
      canInviteMembers: [true]
    });
  }

  private loadWorkspace(): void {
    if (!this.workspaceId) return;

    this.workspaceService.getWorkspace(this.workspaceId).subscribe({
      next: (workspace) => {
        this.workspace = workspace;
        this.populateForm(workspace);
      },
      error: (error) => {
        this.error = 'Failed to load workspace settings';
      }
    });
  }

  private loadMembers(): void {
    if (!this.workspaceId) return;

    this.workspaceMemberService.getMembers(+this.workspaceId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.members = response.members || [];
      },
      error: (error) => {
        console.error('Error loading members:', error);
      }
    });
  }

  private checkPermissions(): void {
    // This would typically check user permissions
    this.canManageMembers = true; // Simplified for now
  }

  private populateForm(workspace: IWorkspace): void {
    this.workspaceForm.patchValue({
      name: workspace.name,
      description: workspace.description || '',
      color: workspace.color || '#6366f1',
      icon: workspace.icon || '🏢',
      status: workspace.status || 'active'
    });
  }

  switchTab(tab: 'general' | 'members' | 'permissions'): void {
    this.activeTab = tab;
  }

  selectColor(color: string): void {
    this.workspaceForm.patchValue({ color });
  }

  selectIcon(icon: string): void {
    this.workspaceForm.patchValue({ icon });
  }

  saveWorkspaceSettings(): void {
    if (this.workspaceForm.invalid || !this.workspace) return;

    this.isSubmitting = true;
    this.error = null;

    const formData = this.workspaceForm.value;

    this.workspaceService.updateWorkspace(this.workspace.id, formData).subscribe({
      next: (updatedWorkspace) => {
        this.isSubmitting = false;
        this.workspace = updatedWorkspace;
        this.workspaceUpdated.emit(updatedWorkspace);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.error = error?.message || 'Failed to save workspace settings';
      }
    });
  }

  savePermissions(): void {
    if (!this.workspace) return;

    this.isSubmitting = true;

    // Save permissions logic here
    setTimeout(() => {
      this.isSubmitting = false;
    }, 1000);
  }

  openInviteModal(): void {
    // Open invite modal logic here
    console.log('Open invite modal');
  }

  editMemberRole(member: IWorkspaceMember): void {
    if (!this.workspaceId) return;

    // For now, just log the action
    // In a real implementation, you would open a modal or dropdown to select the new role
    console.log('Edit member role:', member);

    // Example implementation:
    // const newRole = prompt(`Enter new role for ${member.name} (admin, member, viewer):`);
    // if (newRole && ['admin', 'member', 'viewer'].includes(newRole)) {
    //     this.workspaceMemberService.updateMemberRole(+this.workspaceId, +member.user_id, newRole)
    //         .pipe(takeUntil(this.destroy$))
    //         .subscribe({
    //             next: (updatedMember) => {
    //                 const index = this.members.findIndex(m => m.user_id === member.user_id);
    //                 if (index !== -1) {
    //                     this.members[index] = updatedMember;
    //                 }
    //             },
    //             error: (error) => {
    //                 console.error('Error updating member role:', error);
    //                 this.error = 'Failed to update member role';
    //             }
    //         });
    // }
  }

  removeMember(member: IWorkspaceMember): void {
    // Store the member being removed for later use in confirmation
    this.memberToRemove = member;

    this.confirmDialogData = {
      title: 'Remove Member',
      message: `Are you sure you want to remove <strong>${member.name}</strong> from this workspace?`,
      type: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      details: {
        title: 'What happens when you remove a member:',
        items: [
          'Member will lose access to workspace',
          'All their tasks and assignments will be reassigned',
          'This action cannot be undone'
        ]
      }
    };
    this.showConfirmDialog = true;
  }

  onConfirmAction(): void {
    if (!this.confirmDialogData || !this.workspaceId || !this.memberToRemove) return;

    // Handle the confirmed action based on the dialog type
    if (this.confirmDialogData.title === 'Remove Member') {
      this.isSubmitting = true;

      this.workspaceMemberService.removeMember(+this.workspaceId, +this.memberToRemove.user_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Remove member from local array
            this.members = this.members.filter(m => m.user_id !== this.memberToRemove!.user_id);
            this.isSubmitting = false;
            this.memberToRemove = null;
            this.showConfirmDialog = false;
            this.confirmDialogData = null;
          },
          error: (error) => {
            console.error('Error removing member:', error);
            this.error = 'Failed to remove member';
            this.isSubmitting = false;
            this.showConfirmDialog = false;
            this.confirmDialogData = null;
            this.memberToRemove = null;
          }
        });
      return;
    }

    this.showConfirmDialog = false;
    this.confirmDialogData = null;
    this.memberToRemove = null;
  }

  onCancelAction(): void {
    this.showConfirmDialog = false;
    this.confirmDialogData = null;
    this.memberToRemove = null;
  }

  goBack(): void {
    this.router.navigate(['/workspaces']);
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

  trackMember(index: number, member: IWorkspaceMember): string {
    return member.user_id;
  }

  getInitials(name: string): string {
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}