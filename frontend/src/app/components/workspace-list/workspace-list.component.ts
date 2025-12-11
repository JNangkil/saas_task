import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IWorkspace } from '../../interfaces/workspace.interface';
import { WorkspaceService } from '../../services/workspace.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-workspace-list',
  standalone: true,
  imports: [CommonModule, ConfirmationDialogComponent],
  template: `
    <div class="workspace-list">
      <!-- Header -->
      <div class="list-header">
        <div class="header-content">
          <h2 class="header-title">Workspaces</h2>
          <p class="header-subtitle">Manage and organize your team workspaces</p>
        </div>
        <button class="create-btn" (click)="createWorkspace()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3V15M3 9H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Create Workspace
        </button>
      </div>
      
      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading">
        <div class="workspace-grid">
          <div class="skeleton-card" *ngFor="let i of [1,2,3]">
            <div class="skeleton-header">
              <div class="skeleton skeleton-icon"></div>
              <div class="skeleton-info">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-subtitle"></div>
              </div>
            </div>
            <div class="skeleton skeleton-description"></div>
            <div class="skeleton-footer">
              <div class="skeleton skeleton-badge"></div>
              <div class="skeleton skeleton-badge"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Error State -->
      <div class="error-container" *ngIf="error">
        <div class="error-card">
          <div class="error-icon">⚠️</div>
          <h3>Failed to load workspaces</h3>
          <p>{{ error }}</p>
          <button class="retry-btn" (click)="loadWorkspaces()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M5 7L1 8L2 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Try Again
          </button>
        </div>
      </div>
      
      <!-- Workspace Grid -->
      <div class="workspace-grid" *ngIf="!isLoading && !error && workspaces && workspaces.length > 0">
        <div
          class="workspace-card"
          *ngFor="let workspace of workspaces; trackBy: trackWorkspace"
          [class.active]="workspace.id === currentWorkspace?.id"
          [class.archived]="workspace.is_archived || workspace.status === 'archived'"
          [class.inactive]="!workspace.is_active || workspace.status === 'inactive'"
          [class.disabled]="workspace.is_disabled || workspace.status === 'disabled'"
          (click)="selectWorkspace(workspace)">
          
          <!-- Card Header -->
          <div class="card-header">
            <div 
              class="card-icon"
              [style.background]="getIconBackground(workspace.color)">
              {{ workspace.icon || '🏢' }}
            </div>
            <div class="card-title-section">
              <h3 class="card-title">{{ workspace.name }}</h3>
              <div class="card-status-badges">
                <span class="card-status archived" *ngIf="workspace.is_archived || workspace.status === 'archived'">Archived</span>
                <span class="card-status inactive" *ngIf="!workspace.is_active || workspace.status === 'inactive'">Inactive</span>
                <span class="card-status disabled" *ngIf="workspace.is_disabled || workspace.status === 'disabled'">Disabled</span>
              </div>
            </div>
            <div class="card-menu" (click)="$event.stopPropagation()">
              <button 
                class="menu-btn"
                [class.open]="openMenuId === workspace.id"
                (click)="toggleMenu(workspace.id)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                  <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                </svg>
              </button>
              <div class="card-menu-dropdown" *ngIf="openMenuId === workspace.id">
                <button class="menu-item" (click)="editWorkspace(workspace)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Edit
                </button>
                <button class="menu-item" (click)="navigateToMembers(workspace)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="5" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M1 12C1 9.79086 2.79086 8 5 8C7.20914 8 9 9.79086 9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="10" cy="5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M13 12C13 10.3431 11.6569 9 10 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  Members
                </button>
                <div class="menu-divider"></div>
                <button
                  class="menu-item"
                  *ngIf="!workspace.is_archived && workspace.status !== 'archived' && workspace.status !== 'disabled'"
                  (click)="archiveWorkspace(workspace)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="5" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M1 3C1 2.44772 1.44772 2 2 2H12C12.5523 2 13 2.44772 13 3V5H1V3Z" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                  Archive
                </button>
                <button
                  class="menu-item"
                  *ngIf="workspace.is_archived || workspace.status === 'archived'"
                  (click)="restoreWorkspace(workspace)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7C1 3.68629 3.68629 1 7 1C10.3137 1 13 3.68629 13 7C13 10.3137 10.3137 13 7 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M4 6L1 7L2 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Restore
                </button>
                <button
                  class="menu-item danger"
                  *ngIf="!workspace.is_default"
                  (click)="deleteWorkspace(workspace)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3H11M5 3V1M9 3V1M4 7H10M5 7V11M9 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
          
          <!-- Card Body -->
          <div class="card-body">
            <p class="card-description">
              {{ workspace.description || 'No description provided' }}
            </p>
          </div>
          
          <!-- Card Footer -->
          <div class="card-footer">
            <div class="card-meta">
              <div class="meta-item" *ngIf="workspace.member_count !== undefined">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="5" cy="4" r="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M1 12C1 9.79086 2.79086 8 5 8C7.20914 8 9 9.79086 9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <circle cx="10" cy="5" r="1.5" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M13 12C13 10.3431 11.6569 9 10 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                {{ workspace.member_count }} members
              </div>
            </div>
            <span 
              class="role-badge"
              [class]="'badge-' + workspace.user_role"
              *ngIf="workspace.user_role">
              {{ formatRole(workspace.user_role) }}
            </span>
          </div>
          
          <!-- Active Indicator -->
          <div class="active-indicator" *ngIf="workspace.id === currentWorkspace?.id"></div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && !error && workspaces && workspaces.length === 0">
        <div class="empty-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <rect x="10" y="20" width="60" height="50" rx="4" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
            <path d="M40 35V55M30 45H50" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h3 class="empty-title">No Workspaces Yet</h3>
        <p class="empty-description">
          Create your first workspace to start organizing your projects and collaborating with your team.
        </p>
        <button class="create-first-btn" (click)="createWorkspace()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3V15M3 9H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Create Your First Workspace
        </button>
      </div>

      <!-- Confirmation Dialog -->
      <app-confirmation-dialog
        [isVisible]="showConfirmDialog"
        [data]="confirmDialogData"
        [isLoading]="isDeleting"
        [loadingText]="isDeleting ? 'Deleting workspace...' : ''"
        (confirm)="onConfirmAction()"
        (cancel)="onCancelAction()">
      </app-confirmation-dialog>
    </div>
  `,
  styles: [`
    .workspace-list {
      padding: 12px;
    }

    /* Header */
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      gap: 20px;
    }

    .header-content {
      flex: 1;
    }

    .header-title {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: var(--slate-800, #1e293b);
      background: linear-gradient(135deg, var(--slate-800, #1e293b) 0%, var(--slate-600, #475569) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
    }

    .header-subtitle {
      margin: 8px 0 0;
      font-size: 16px;
      color: var(--slate-500, #64748b);
      line-height: 1.5;
    }

    .create-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-lg, 12px);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
      white-space: nowrap;
    }

    .create-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }

    .create-btn:active {
      transform: translateY(0);
    }

    /* Workspace Grid */
    .workspace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 28px;
    }

    /* Workspace Card */
    .workspace-card {
      position: relative;
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      padding: 28px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }

    .workspace-card:hover {
      border-color: var(--slate-200, #e2e8f0);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15);
      transform: translateY(-6px) scale(1.02);
    }

    .workspace-card.active {
      border-color: var(--primary-300, #a5b4fc);
      box-shadow: 0 0 0 3px var(--primary-100, #e0e7ff), 0 10px 30px -10px rgba(99, 102, 241, 0.2);
    }

    .workspace-card.archived {
      opacity: 0.7;
      filter: grayscale(0.3);
      position: relative;
    }

    .workspace-card.archived::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.1);
      border-radius: var(--radius-xl, 16px);
      pointer-events: none;
    }

    .workspace-card.archived:hover {
      opacity: 0.8;
      filter: grayscale(0.1);
    }

    .workspace-card.inactive {
      opacity: 0.6;
      border-color: var(--warning-200, #fef3c7);
      background: var(--warning-50, #fffbeb);
    }

    .workspace-card.inactive::before {
      content: '';
      position: absolute;
      top: 12px;
      right: 12px;
      width: 8px;
      height: 8px;
      background: var(--warning-400, #fbbf24);
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
    }

    .workspace-card.disabled {
      opacity: 0.5;
      border-color: var(--slate-300, #cbd5e1);
      background: var(--slate-100, #f1f5f9);
      cursor: not-allowed;
      pointer-events: none;
    }

    .workspace-card.disabled::before {
      content: '';
      position: absolute;
      top: 12px;
      right: 12px;
      width: 8px;
      height: 8px;
      background: var(--slate-400, #94a3b8);
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.3);
    }

    .workspace-card.disabled:hover {
      transform: none;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
    }

    .active-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }

    /* Card Header */
    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
    }

    .card-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg, 14px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
      transition: transform 0.3s ease;
    }

    .workspace-card:hover .card-icon {
      transform: scale(1.1) rotate(2deg);
    }

    .card-title-section {
      flex: 1;
      min-width: 0;
    }

    .card-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
      margin-bottom: 4px;
    }

    .card-status-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .card-status {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: var(--radius-full, 9999px);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      border: 1px solid;
    }

    .card-status.archived {
      color: var(--warning-700, #b45309);
      background: var(--warning-50, #fffbeb);
      border-color: var(--warning-200, #fef3c7);
    }

    .card-status.inactive {
      color: var(--warning-600, #d97706);
      background: var(--warning-50, #fffbeb);
      border-color: var(--warning-200, #fef3c7);
    }

    .card-status.disabled {
      color: var(--slate-600, #475569);
      background: var(--slate-100, #f1f5f9);
      border-color: var(--slate-200, #e2e8f0);
    }

    /* Card Menu */
    .card-menu {
      position: relative;
    }

    .menu-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: var(--radius-md, 10px);
      color: var(--slate-400, #94a3b8);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .menu-btn:hover,
    .menu-btn.open {
      background: var(--slate-100, #f1f5f9);
      color: var(--slate-600, #475569);
      transform: scale(1.05);
    }

    .card-menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 6px;
      min-width: 180px;
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1));
      z-index: 10;
      overflow: hidden;
      animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      background: transparent;
      border: none;
      font-size: 14px;
      color: var(--slate-700, #334155);
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      text-align: left;
    }

    .menu-item:hover {
      background: var(--slate-50, #f8fafc);
      transform: translateX(4px);
    }

    .menu-item.danger {
      color: var(--error-600, #e11d48);
    }

    .menu-item.danger svg {
      color: var(--error-500, #f43f5e);
    }

    .menu-item.danger:hover {
      background: var(--error-50, #fff1f2);
      color: var(--error-700, #b91c1c);
    }

    .menu-item.danger:hover svg {
      color: var(--error-600, #e11d48);
    }

    .menu-item svg {
      color: var(--slate-400, #94a3b8);
      transition: color 0.15s ease;
    }

    .menu-item:hover svg {
      color: var(--slate-600, #475569);
    }

    .menu-divider {
      height: 1px;
      background: var(--slate-100, #f1f5f9);
      margin: 6px 0;
    }

    /* Card Body */
    .card-body {
      margin-bottom: 20px;
    }

    .card-description {
      margin: 0;
      font-size: 15px;
      color: var(--slate-500, #64748b);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Card Footer */
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .card-meta {
      display: flex;
      gap: 20px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--slate-500, #64748b);
      font-weight: 500;
    }

    .meta-item svg {
      color: var(--slate-400, #94a3b8);
      flex-shrink: 0;
    }

    .role-badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: var(--radius-full, 9999px);
      letter-spacing: 0.02em;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

    /* Skeleton Loading */
    .skeleton-card {
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      padding: 28px;
    }

    .skeleton-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .skeleton {
      background: linear-gradient(90deg, var(--slate-200, #e2e8f0) 25%, var(--slate-100, #f1f5f9) 50%, var(--slate-200, #e2e8f0) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s linear infinite;
      border-radius: var(--radius-sm, 8px);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton-icon {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-lg, 14px);
    }

    .skeleton-info {
      flex: 1;
    }

    .skeleton-title {
      width: 60%;
      height: 24px;
      margin-bottom: 8px;
    }

    .skeleton-subtitle {
      width: 40%;
      height: 16px;
    }

    .skeleton-description {
      width: 100%;
      height: 48px;
      margin-bottom: 20px;
    }

    .skeleton-footer {
      display: flex;
      gap: 16px;
    }

    .skeleton-badge {
      width: 90px;
      height: 28px;
      border-radius: var(--radius-full, 9999px);
    }

    /* Error State */
    .error-container {
      display: flex;
      justify-content: center;
      padding: 60px 20px;
    }

    .error-card {
      text-align: center;
      padding: 48px;
      background: var(--error-50, #fff1f2);
      border: 1px solid var(--error-100, #ffe4e6);
      border-radius: var(--radius-xl, 16px);
      max-width: 420px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
    }

    .error-icon {
      font-size: 56px;
      margin-bottom: 20px;
      opacity: 0.8;
    }

    .error-card h3 {
      margin: 0 0 12px;
      font-size: 20px;
      color: var(--error-600, #e11d48);
      font-weight: 600;
    }

    .error-card p {
      margin: 0 0 24px;
      font-size: 15px;
      color: var(--slate-600, #475569);
      line-height: 1.6;
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 24px;
      background: var(--error-500, #f43f5e);
      color: white;
      border: none;
      border-radius: var(--radius-md, 10px);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }

    .retry-btn:hover {
      background: var(--error-600, #e11d48);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 100px 20px;
      text-align: center;
    }

    .empty-icon {
      color: var(--slate-300, #cbd5e1);
      margin-bottom: 32px;
      opacity: 0.8;
    }

    .empty-title {
      margin: 0 0 16px;
      font-size: 24px;
      font-weight: 600;
      color: var(--slate-700, #334155);
    }

    .empty-description {
      margin: 0 0 32px;
      font-size: 16px;
      color: var(--slate-500, #64748b);
      max-width: 440px;
      line-height: 1.6;
    }

    .create-first-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 32px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-lg, 12px);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
    }

    .create-first-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
    }

    .create-first-btn:active {
      transform: translateY(0);
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .workspace-grid {
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 24px;
      }
    }

    @media (max-width: 768px) {
      .workspace-list {
        padding: 8px;
      }

      .list-header {
        flex-direction: column;
        align-items: stretch;
        gap: 24px;
        margin-bottom: 32px;
      }

      .header-title {
        font-size: 28px;
      }

      .header-subtitle {
        font-size: 15px;
      }

      .create-btn {
        justify-content: center;
        padding: 12px 20px;
        font-size: 14px;
      }

      .workspace-grid {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .workspace-card {
        padding: 24px;
      }

      .card-icon {
        width: 48px;
        height: 48px;
        font-size: 22px;
      }

      .card-title {
        font-size: 18px;
      }

      .card-description {
        font-size: 14px;
      }
    }

    @media (max-width: 480px) {
      .workspace-card {
        padding: 20px;
      }

      .card-header {
        gap: 12px;
        margin-bottom: 16px;
      }

      .card-icon {
        width: 44px;
        height: 44px;
        font-size: 20px;
      }

      .card-title {
        font-size: 17px;
      }

      .card-description {
        font-size: 13px;
        -webkit-line-clamp: 3;
      }

      .card-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .card-meta {
        gap: 16px;
      }

      .meta-item {
        font-size: 12px;
      }

      .role-badge {
        font-size: 10px;
        padding: 4px 10px;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .workspace-card {
        border-width: 2px;
      }

      .workspace-card.active {
        border-width: 3px;
      }

      .card-status,
      .role-badge {
        border-width: 2px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .workspace-card,
      .card-icon,
      .menu-btn,
      .menu-item,
      .create-btn,
      .create-first-btn,
      .retry-btn {
        transition: none;
      }

      .workspace-card:hover {
        transform: none;
      }

      .card-menu-dropdown {
        animation: none;
      }

      .active-indicator {
        animation: none;
      }

      .skeleton {
        animation: none;
      }
    }
  `]
})
export class WorkspaceListComponent implements OnInit {
  workspaces: IWorkspace[] = [];
  currentWorkspace: IWorkspace | null = null;
  isLoading = false;
  error: string | null = null;
  openMenuId: string | null = null;
  showConfirmDialog = false;
  confirmDialogData: ConfirmationDialogData | null = null;
  isDeleting = false;
  pendingAction: { type: 'archive' | 'delete' | 'restore'; workspace: IWorkspace } | null = null;

  constructor(
    private workspaceService: WorkspaceService,
    private workspaceContextService: WorkspaceContextService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadWorkspaces();

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.card-menu')) {
        this.openMenuId = null;
      }
    });
  }

  loadWorkspaces(): void {
    this.isLoading = true;
    this.error = null;

    this.workspaceService.getCurrentTenantWorkspaces().subscribe({
      next: (response) => {
        // Handle both array and object responses
        const workspaces = Array.isArray(response) ? response : (response?.data || []);
        this.workspaces = workspaces || [];
        this.isLoading = false;

        if (!this.workspaceContextService.context.currentWorkspace && this.workspaces.length > 0) {
          this.workspaceContextService.setCurrentWorkspace(this.workspaces[0]);
        }
        this.currentWorkspace = this.workspaceContextService.context.currentWorkspace;
      },
      error: (error) => {
        console.error('Error loading workspaces:', error);

        // Handle authentication errors
        if (error.status === 401) {
          this.error = 'Your session has expired. Please log in again.';
          // Optionally redirect to login after a delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        } else {
          this.error = error.message || 'Unable to load workspaces. Please try again.';
        }

        this.workspaces = [];
        this.isLoading = false;
      }
    });
  }

  trackWorkspace(index: number, workspace: IWorkspace): string {
    return workspace.id;
  }

  selectWorkspace(workspace: IWorkspace): void {
    if (this.openMenuId) return; // Don't select if menu is open

    // Prevent selection of inactive or disabled workspaces
    if (!workspace.is_active || workspace.status === 'inactive' || workspace.status === 'disabled') {
      this.showWorkspaceStatusMessage(workspace);
      return;
    }

    // Allow selection of archived workspaces but with warning
    if (workspace.is_archived || workspace.status === 'archived') {
      this.showArchivedWarning(workspace);
      return;
    }

    this.workspaceContextService.setCurrentWorkspace(workspace);
    this.currentWorkspace = workspace;
  }

  private showWorkspaceStatusMessage(workspace: IWorkspace): void {
    const status = workspace.status || 'inactive';
    const message = status === 'inactive'
      ? `This workspace is currently inactive and cannot be accessed.`
      : `This workspace is disabled and cannot be accessed. ${workspace.status_reason || ''}`;

    // You could show a toast or notification here
    console.warn(message);
  }

  private showArchivedWarning(workspace: IWorkspace): void {
    const message = `This workspace is archived. Would you like to restore it to access its content?`;
    // You could show a confirmation dialog here
    console.warn(message);
  }

  createWorkspace(): void {
    this.router.navigate(['/workspaces/create']);
  }

  editWorkspace(workspace: IWorkspace): void {
    this.openMenuId = null;
    this.router.navigate(['/workspaces', workspace.id, 'edit']);
  }

  navigateToMembers(workspace: IWorkspace): void {
    this.openMenuId = null;
    this.router.navigate(['/workspaces', workspace.id, 'members']);
  }

  toggleMenu(workspaceId: string): void {
    this.openMenuId = this.openMenuId === workspaceId ? null : workspaceId;
  }

  archiveWorkspace(workspace: IWorkspace): void {
    this.openMenuId = null;
    this.pendingAction = { type: 'archive', workspace };

    this.confirmDialogData = {
      title: 'Archive Workspace',
      message: `Are you sure you want to archive "<strong>${workspace.name}</strong>"?`,
      type: 'warning',
      confirmText: 'Archive',
      cancelText: 'Cancel',
      showCheckbox: true,
      checkboxLabel: 'I understand that archiving will hide this workspace and its content from active view',
      checkboxRequired: true,
      details: {
        title: 'What happens when you archive:',
        items: [
          'Workspace and all its content will be hidden from main view',
          'Members will lose access to workspace',
          'You can restore the workspace at any time',
          'All data will be preserved'
        ]
      }
    };
    this.showConfirmDialog = true;
  }

  restoreWorkspace(workspace: IWorkspace): void {
    this.openMenuId = null;
    this.pendingAction = { type: 'restore', workspace };

    this.confirmDialogData = {
      title: 'Restore Workspace',
      message: `Are you sure you want to restore "<strong>${workspace.name}</strong>"?`,
      type: 'info',
      confirmText: 'Restore',
      cancelText: 'Cancel',
      details: {
        title: 'What happens when you restore:',
        items: [
          'Workspace will become visible again to all members',
          'Previous access permissions will be restored',
          'All data and content will be available'
        ]
      }
    };
    this.showConfirmDialog = true;
  }

  deleteWorkspace(workspace: IWorkspace): void {
    this.openMenuId = null;
    this.pendingAction = { type: 'delete', workspace };

    this.confirmDialogData = {
      title: 'Delete Workspace',
      message: `Are you sure you want to permanently delete "<strong>${workspace.name}</strong>"?`,
      type: 'danger',
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      showCheckbox: true,
      checkboxLabel: 'I understand this action cannot be undone',
      checkboxRequired: true,
      details: {
        title: '⚠️ Warning: This action cannot be undone',
        items: [
          'Workspace and all its content will be permanently deleted',
          'All tasks, boards, and data will be lost',
          'Member access will be revoked immediately',
          'This action cannot be reversed'
        ]
      }
    };
    this.showConfirmDialog = true;
  }

  onConfirmAction(): void {
    if (!this.pendingAction) return;

    const { type, workspace } = this.pendingAction;

    if (type === 'archive') {
      this.workspaceService.archiveWorkspace(workspace.id).subscribe({
        next: () => {
          this.loadWorkspaces();
          this.closeDialog();
        },
        error: (error) => {
          this.error = 'Failed to archive workspace';
          this.closeDialog();
        }
      });
    } else if (type === 'restore') {
      this.workspaceService.restoreWorkspace(workspace.id).subscribe({
        next: () => {
          this.loadWorkspaces();
          this.closeDialog();
        },
        error: (error) => {
          this.error = 'Failed to restore workspace';
          this.closeDialog();
        }
      });
    } else if (type === 'delete') {
      this.isDeleting = true;
      this.workspaceService.deleteWorkspace(workspace.id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.loadWorkspaces();
          this.closeDialog();
        },
        error: (error) => {
          this.isDeleting = false;
          this.error = 'Failed to delete workspace';
          this.closeDialog();
        }
      });
    }
  }

  onCancelAction(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.showConfirmDialog = false;
    this.confirmDialogData = null;
    this.pendingAction = null;
  }

  getIconBackground(color?: string): string {
    if (!color) {
      return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    }
    return `linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 20)} 100%)`;
  }

  formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
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