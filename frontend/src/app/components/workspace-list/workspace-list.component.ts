import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IWorkspace } from '../../interfaces/workspace.interface';
import { WorkspaceService } from '../../services/workspace.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';

@Component({
  selector: 'app-workspace-list',
  standalone: true,
  imports: [CommonModule],
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
      <div class="workspace-grid" *ngIf="!isLoading && !error && workspaces.length > 0">
        <div 
          class="workspace-card" 
          *ngFor="let workspace of workspaces; trackBy: trackWorkspace"
          [class.active]="workspace.id === currentWorkspace?.id"
          [class.archived]="workspace.is_archived"
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
              <span class="card-status" *ngIf="workspace.is_archived">Archived</span>
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
                  *ngIf="!workspace.is_archived"
                  (click)="archiveWorkspace(workspace)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="5" width="10" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M1 3C1 2.44772 1.44772 2 2 2H12C12.5523 2 13 2.44772 13 3V5H1V3Z" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                  Archive
                </button>
                <button 
                  class="menu-item"
                  *ngIf="workspace.is_archived"
                  (click)="restoreWorkspace(workspace)">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7C1 3.68629 3.68629 1 7 1C10.3137 1 13 3.68629 13 7C13 10.3137 10.3137 13 7 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M4 6L1 7L2 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  Restore
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
      <div class="empty-state" *ngIf="!isLoading && !error && workspaces.length === 0">
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
    </div>
  `,
  styles: [`
    .workspace-list {
      padding: 8px;
    }

    /* Header */
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .header-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--slate-800, #1e293b);
    }

    .header-subtitle {
      margin: 6px 0 0;
      font-size: 15px;
      color: var(--slate-500, #64748b);
    }

    .create-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-lg, 12px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
    }

    .create-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    /* Workspace Grid */
    .workspace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    /* Workspace Card */
    .workspace-card {
      position: relative;
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      padding: 24px;
      cursor: pointer;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .workspace-card:hover {
      border-color: var(--slate-200, #e2e8f0);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
      transform: translateY(-4px);
    }

    .workspace-card.active {
      border-color: var(--primary-300, #a5b4fc);
      box-shadow: 0 0 0 3px var(--primary-100, #e0e7ff);
    }

    .workspace-card.archived {
      opacity: 0.7;
    }

    .active-indicator {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
    }

    /* Card Header */
    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 16px;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg, 12px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card-title-section {
      flex: 1;
      min-width: 0;
    }

    .card-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-status {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      color: var(--warning-600, #d97706);
      background: var(--warning-50, #fffbeb);
      padding: 2px 8px;
      border-radius: var(--radius-sm, 6px);
      margin-top: 4px;
    }

    /* Card Menu */
    .card-menu {
      position: relative;
    }

    .menu-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: var(--radius-md, 8px);
      color: var(--slate-400, #94a3b8);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .menu-btn:hover,
    .menu-btn.open {
      background: var(--slate-100, #f1f5f9);
      color: var(--slate-600, #475569);
    }

    .card-menu-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      min-width: 160px;
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-lg, 12px);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
      z-index: 10;
      overflow: hidden;
      animation: scaleIn 0.15s ease-out;
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 14px;
      background: transparent;
      border: none;
      font-size: 13px;
      color: var(--slate-700, #334155);
      cursor: pointer;
      transition: background 0.1s ease;
      text-align: left;
    }

    .menu-item:hover {
      background: var(--slate-50, #f8fafc);
    }

    .menu-item svg {
      color: var(--slate-400, #94a3b8);
    }

    .menu-divider {
      height: 1px;
      background: var(--slate-100, #f1f5f9);
      margin: 4px 0;
    }

    /* Card Body */
    .card-body {
      margin-bottom: 16px;
    }

    .card-description {
      margin: 0;
      font-size: 14px;
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
    }

    .card-meta {
      display: flex;
      gap: 16px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--slate-500, #64748b);
    }

    .meta-item svg {
      color: var(--slate-400, #94a3b8);
    }

    .role-badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 4px 10px;
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

    /* Skeleton Loading */
    .skeleton-card {
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      padding: 24px;
    }

    .skeleton-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }

    .skeleton {
      background: linear-gradient(90deg, var(--slate-200, #e2e8f0) 25%, var(--slate-100, #f1f5f9) 50%, var(--slate-200, #e2e8f0) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s linear infinite;
      border-radius: var(--radius-sm, 6px);
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg, 12px);
    }

    .skeleton-info {
      flex: 1;
    }

    .skeleton-title {
      width: 60%;
      height: 20px;
      margin-bottom: 8px;
    }

    .skeleton-subtitle {
      width: 40%;
      height: 14px;
    }

    .skeleton-description {
      width: 100%;
      height: 40px;
      margin-bottom: 16px;
    }

    .skeleton-footer {
      display: flex;
      gap: 12px;
    }

    .skeleton-badge {
      width: 80px;
      height: 24px;
      border-radius: var(--radius-full, 9999px);
    }

    /* Error State */
    .error-container {
      display: flex;
      justify-content: center;
      padding: 40px 0;
    }

    .error-card {
      text-align: center;
      padding: 40px;
      background: var(--error-50, #fff1f2);
      border: 1px solid var(--error-100, #ffe4e6);
      border-radius: var(--radius-xl, 16px);
      max-width: 400px;
    }

    .error-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .error-card h3 {
      margin: 0 0 8px;
      font-size: 18px;
      color: var(--error-600, #e11d48);
    }

    .error-card p {
      margin: 0 0 20px;
      font-size: 14px;
      color: var(--slate-600, #475569);
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: var(--error-500, #f43f5e);
      color: white;
      border: none;
      border-radius: var(--radius-md, 8px);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .retry-btn:hover {
      background: var(--error-600, #e11d48);
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
    }

    .empty-icon {
      color: var(--slate-300, #cbd5e1);
      margin-bottom: 24px;
    }

    .empty-title {
      margin: 0 0 12px;
      font-size: 22px;
      font-weight: 600;
      color: var(--slate-700, #334155);
    }

    .empty-description {
      margin: 0 0 28px;
      font-size: 15px;
      color: var(--slate-500, #64748b);
      max-width: 400px;
      line-height: 1.6;
    }

    .create-first-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 28px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-lg, 12px);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
    }

    .create-first-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .list-header {
        flex-direction: column;
        align-items: stretch;
        gap: 20px;
      }

      .create-btn {
        justify-content: center;
      }

      .workspace-grid {
        grid-template-columns: 1fr;
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
      next: (workspaces) => {
        this.workspaces = workspaces;
        this.isLoading = false;

        if (!this.workspaceContextService.context.currentWorkspace && workspaces.length > 0) {
          this.workspaceContextService.setCurrentWorkspace(workspaces[0]);
        }
        this.currentWorkspace = this.workspaceContextService.context.currentWorkspace;
      },
      error: (error) => {
        this.error = 'Unable to load workspaces. Please try again.';
        this.isLoading = false;
      }
    });
  }

  trackWorkspace(index: number, workspace: IWorkspace): string {
    return workspace.id;
  }

  selectWorkspace(workspace: IWorkspace): void {
    if (this.openMenuId) return; // Don't select if menu is open
    this.workspaceContextService.setCurrentWorkspace(workspace);
    this.currentWorkspace = workspace;
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
    if (confirm(`Are you sure you want to archive "${workspace.name}"?`)) {
      this.workspaceService.archiveWorkspace(workspace.id).subscribe({
        next: () => {
          this.loadWorkspaces();
        },
        error: (error) => {
          this.error = 'Failed to archive workspace';
        }
      });
    }
  }

  restoreWorkspace(workspace: IWorkspace): void {
    this.openMenuId = null;
    if (confirm(`Are you sure you want to restore "${workspace.name}"?`)) {
      this.workspaceService.restoreWorkspace(workspace.id).subscribe({
        next: () => {
          this.loadWorkspaces();
        },
        error: (error) => {
          this.error = 'Failed to restore workspace';
        }
      });
    }
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