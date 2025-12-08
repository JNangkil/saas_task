import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IWorkspace, IWorkspaceContext } from '../../interfaces/workspace.interface';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="workspace-selector" *ngIf="context$ | async as context">
      <button 
        class="selector-trigger"
        [class.open]="isDropdownOpen"
        (click)="toggleDropdown()">
        <div class="selector-content">
          <div 
            class="workspace-icon"
            [style.background]="getIconBackground(context.currentWorkspace?.color)">
            {{ context.currentWorkspace?.icon || '🏢' }}
          </div>
          <div class="workspace-info">
            <span class="workspace-name">{{ context.currentWorkspace?.name || 'Select Workspace' }}</span>
            <span class="workspace-meta" *ngIf="context.userWorkspaces && context.userWorkspaces.length > 1">
              {{ context.userWorkspaces.length }} workspaces
            </span>
          </div>
        </div>
        <svg 
          class="chevron-icon" 
          [class.rotated]="isDropdownOpen"
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      
      <div class="dropdown-panel" *ngIf="isDropdownOpen">
        <div class="dropdown-header">
          <span class="header-label">Workspaces</span>
          <span class="header-count">{{ context.userWorkspaces.length || 0 }}</span>
        </div>
        
        <div class="dropdown-body">
          <div 
            class="workspace-item" 
            *ngFor="let workspace of context.userWorkspaces; trackBy: trackWorkspace"
            [class.active]="workspace.id === context.currentWorkspace?.id"
            (click)="selectWorkspace(workspace)">
            <div class="item-indicator"></div>
            <div 
              class="item-icon"
              [style.background]="getIconBackground(workspace.color)">
              {{ workspace.icon || '🏢' }}
            </div>
            <div class="item-content">
              <span class="item-name">{{ workspace.name }}</span>
              <span class="item-description" *ngIf="workspace.description">
                {{ workspace.description | slice:0:40 }}{{ workspace.description!.length > 40 ? '...' : '' }}
              </span>
            </div>
            <div class="item-meta">
              <span class="role-badge" [class]="'badge-' + workspace.user_role" *ngIf="workspace.user_role">
                {{ formatRole(workspace.user_role) }}
              </span>
              <svg *ngIf="workspace.id === context.currentWorkspace?.id" class="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div class="dropdown-footer">
          <button class="manage-btn" (click)="goToWorkspaceManagement()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Manage Workspaces
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workspace-selector {
      position: relative;
      display: inline-block;
    }

    .selector-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 12px;
      min-width: 220px;
      background: white;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-lg, 12px);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .selector-trigger:hover {
      border-color: var(--slate-300, #cbd5e1);
      box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1));
    }

    .selector-trigger.open {
      border-color: var(--primary-500, #6366f1);
      box-shadow: 0 0 0 3px var(--primary-100, #e0e7ff);
    }

    .selector-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .workspace-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      background: var(--gradient-primary, linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%));
      color: white;
    }

    .workspace-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }

    .workspace-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      line-height: 1.3;
    }

    .workspace-meta {
      font-size: 12px;
      color: var(--slate-500, #64748b);
    }

    .chevron-icon {
      color: var(--slate-400, #94a3b8);
      transition: transform 0.2s ease;
    }

    .chevron-icon.rotated {
      transform: rotate(180deg);
    }

    /* Dropdown Panel */
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      min-width: 280px;
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1));
      z-index: var(--z-dropdown, 100);
      animation: slideDown 0.2s ease-out;
      overflow: hidden;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--slate-100, #f1f5f9);
    }

    .header-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-500, #64748b);
    }

    .header-count {
      font-size: 11px;
      font-weight: 600;
      color: var(--slate-400, #94a3b8);
      background: var(--slate-100, #f1f5f9);
      padding: 2px 8px;
      border-radius: var(--radius-full, 9999px);
    }

    .dropdown-body {
      max-height: 320px;
      overflow-y: auto;
      padding: 8px 0;
    }

    .workspace-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .workspace-item:hover {
      background: var(--slate-50, #f8fafc);
    }

    .workspace-item.active {
      background: var(--primary-50, #eef2ff);
    }

    .item-indicator {
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 3px;
      background: transparent;
      border-radius: 0 3px 3px 0;
      transition: background 0.15s ease;
    }

    .workspace-item.active .item-indicator {
      background: linear-gradient(180deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
    }

    .item-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .item-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .item-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--slate-800, #1e293b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-description {
      font-size: 12px;
      color: var(--slate-500, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 3px 8px;
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

    .check-icon {
      color: var(--primary-500, #6366f1);
    }

    .dropdown-footer {
      padding: 12px;
      border-top: 1px solid var(--slate-100, #f1f5f9);
      background: var(--slate-50, #f8fafc);
    }

    .manage-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md, 8px);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .manage-btn:hover {
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      transform: translateY(-1px);
    }

    .manage-btn svg {
      opacity: 0.9;
    }

    /* Scrollbar styling */
    .dropdown-body::-webkit-scrollbar {
      width: 6px;
    }

    .dropdown-body::-webkit-scrollbar-track {
      background: var(--slate-100, #f1f5f9);
    }

    .dropdown-body::-webkit-scrollbar-thumb {
      background: var(--slate-300, #cbd5e1);
      border-radius: 3px;
    }

    .dropdown-body::-webkit-scrollbar-thumb:hover {
      background: var(--slate-400, #94a3b8);
    }
  `]
})
export class WorkspaceSelectorComponent implements OnInit, OnDestroy {
  context$: Observable<IWorkspaceContext>;
  isDropdownOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    private workspaceContextService: WorkspaceContextService,
    private workspaceService: WorkspaceService,
    private router: Router,
    private elementRef: ElementRef
  ) {
    this.context$ = this.workspaceContextService.context$;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isDropdownOpen = false;
  }

  ngOnInit(): void {
    this.loadUserWorkspaces();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectWorkspace(workspace: IWorkspace): void {
    this.workspaceContextService.setCurrentWorkspace(workspace);
    this.isDropdownOpen = false;
  }

  goToWorkspaceManagement(): void {
    this.isDropdownOpen = false;
    this.router.navigate(['/workspaces']);
  }

  trackWorkspace(index: number, workspace: IWorkspace): string {
    return workspace.id;
  }

  getIconBackground(color?: string): string {
    if (!color) {
      return 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
    }
    // Create a slightly darker version for gradient
    return `linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color, 20)} 100%)`;
  }

  formatRole(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  private darkenColor(hex: string, percent: number): string {
    // Simple color darkening
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private loadUserWorkspaces(): void {
    this.workspaceService.getCurrentTenantWorkspaces().subscribe({
      next: (workspaces) => {
        this.workspaceContextService.setUserWorkspaces(workspaces || []);

        if (!this.workspaceContextService.context?.currentWorkspace && workspaces && workspaces.length > 0) {
          this.workspaceContextService.setCurrentWorkspace(workspaces[0]);
        }
      },
      error: (error) => {
        console.error('Error loading workspaces:', error);
        this.workspaceContextService.setError('Failed to load workspaces');
      }
    });
  }
}