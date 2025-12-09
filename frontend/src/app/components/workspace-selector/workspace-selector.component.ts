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
      padding: 10px 14px;
      min-width: 240px;
      background: white;
      border: 1px solid var(--slate-200, #e2e8f0);
      border-radius: var(--radius-lg, 12px);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    
    .selector-trigger:hover {
      border-color: var(--slate-300, #cbd5e1);
      box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1));
      transform: translateY(-1px);
    }
    
    .selector-trigger:active {
      transform: translateY(0);
    }
    
    .selector-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    
    .workspace-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md, 10px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      background: var(--gradient-primary, linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%));
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
      flex-shrink: 0;
    }
    
    .workspace-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      flex: 1;
      min-width: 0;
    }
    
    .workspace-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--slate-800, #1e293b);
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    
    .workspace-meta {
      font-size: 12px;
      color: var(--slate-500, #64748b);
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }
    
    .chevron-icon {
      color: var(--slate-400, #94a3b8);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
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
      min-width: 300px;
      max-width: 400px;
      background: white;
      border: 1px solid var(--slate-100, #f1f5f9);
      border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1));
      z-index: var(--z-dropdown, 100);
      animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      backdrop-filter: blur(8px);
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--slate-100, #f1f5f9);
      background: var(--slate-50, #f8fafc);
    }
    
    .header-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-600, #475569);
    }
    
    .header-count {
      font-size: 11px;
      font-weight: 600;
      color: var(--slate-500, #64748b);
      background: var(--slate-200, #e2e8f0);
      padding: 3px 10px;
      border-radius: var(--radius-full, 9999px);
    }
    
    .dropdown-body {
      max-height: 360px;
      overflow-y: auto;
      padding: 8px 0;
    }
    
    .workspace-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 20px;
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: var(--radius-md, 8px);
      margin: 2px 8px;
    }
    
    .workspace-item:hover {
      background: var(--slate-50, #f8fafc);
      transform: translateX(2px);
    }
    
    .workspace-item.active {
      background: var(--primary-50, #eef2ff);
      box-shadow: 0 0 0 1px var(--primary-200, #c7d2fe);
    }
    
    .item-indicator {
      position: absolute;
      left: 0;
      top: 12px;
      bottom: 12px;
      width: 3px;
      background: transparent;
      border-radius: 0 3px 3px 0;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .workspace-item.active .item-indicator {
      background: linear-gradient(180deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
    }
    
    .item-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md, 10px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.15s ease;
    }
    
    .workspace-item:hover .item-icon {
      transform: scale(1.05);
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
      margin-bottom: 2px;
    }
    
    .item-description {
      font-size: 12px;
      color: var(--slate-500, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }
    
    .item-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    
    .role-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 4px 8px;
      border-radius: var(--radius-full, 9999px);
      letter-spacing: 0.02em;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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
    
    .dropdown-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--slate-100, #f1f5f9);
      background: var(--slate-50, #f8fafc);
    }
    
    .manage-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 20px;
      background: linear-gradient(135deg, var(--primary-500, #6366f1) 0%, var(--secondary-500, #8b5cf6) 100%);
      color: white;
      border: none;
      border-radius: var(--radius-md, 10px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }
    
    .manage-btn:hover {
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }
    
    .manage-btn:active {
      transform: translateY(0);
    }
    
    .manage-btn svg {
      opacity: 0.9;
      transition: opacity 0.2s ease;
    }
    
    .manage-btn:hover svg {
      opacity: 1;
    }
    
    /* Scrollbar styling */
    .dropdown-body::-webkit-scrollbar {
      width: 6px;
    }
    
    .dropdown-body::-webkit-scrollbar-track {
      background: var(--slate-100, #f1f5f9);
      border-radius: 3px;
    }
    
    .dropdown-body::-webkit-scrollbar-thumb {
      background: var(--slate-300, #cbd5e1);
      border-radius: 3px;
      transition: background 0.2s ease;
    }
    
    .dropdown-body::-webkit-scrollbar-thumb:hover {
      background: var(--slate-400, #94a3b8);
    }
    
    /* Responsive design */
    @media (max-width: 640px) {
      .selector-trigger {
        min-width: 200px;
        padding: 8px 12px;
      }
      
      .workspace-icon {
        width: 36px;
        height: 36px;
        font-size: 18px;
      }
      
      .workspace-name {
        font-size: 13px;
      }
      
      .workspace-meta {
        font-size: 11px;
      }
      
      .dropdown-panel {
        min-width: 280px;
        max-width: 320px;
      }
      
      .workspace-item {
        padding: 12px 16px;
      }
      
      .item-icon {
        width: 40px;
        height: 40px;
        font-size: 18px;
      }
      
      .dropdown-header,
      .dropdown-footer {
        padding: 12px 16px;
      }
    }
    
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .selector-trigger {
        border-width: 2px;
      }
      
      .workspace-item.active {
        border: 2px solid var(--primary-600, #4f46e5);
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .selector-trigger,
      .workspace-item,
      .manage-btn,
      .chevron-icon,
      .item-icon {
        transition: none;
      }
      
      .dropdown-panel {
        animation: none;
      }
      
      .check-icon {
        animation: none;
      }
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