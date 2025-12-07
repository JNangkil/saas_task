import { Component, OnInit, OnDestroy } from '@angular/core';
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
      <div class="current-workspace" (click)="toggleDropdown()">
        <div class="workspace-info">
          <div class="workspace-icon" [style.color]="context.currentWorkspace?.color || '#3B82F6'">
            {{ context.currentWorkspace?.icon || '🏢' }}
          </div>
          <div class="workspace-details">
            <span class="workspace-name">{{ context.currentWorkspace?.name || 'Select Workspace' }}</span>
            <span class="workspace-count" *ngIf="context.userWorkspaces?.length > 1">
              ({{ context.userWorkspaces?.length || 0 }} workspaces)
            </span>
          </div>
        </div>
        <div class="dropdown-arrow" *ngIf="context.userWorkspaces?.length > 1">▼</div>
      </div>
      
      <div class="dropdown-menu" *ngIf="isDropdownOpen">
        <div class="dropdown-header">
          <span>Workspaces</span>
        </div>
        <div class="dropdown-list">
          <div 
            class="workspace-item" 
            *ngFor="let workspace of context.userWorkspaces" 
            [class.active]="workspace.id === context.currentWorkspace?.id"
            (click)="selectWorkspace(workspace)">
            <div class="workspace-icon" [style.color]="workspace.color">
              {{ workspace.icon || '🏢' }}
            </div>
            <div class="workspace-name">{{ workspace.name }}</div>
            <div class="workspace-role" *ngIf="workspace.user_role">
              <span class="role-badge">{{ workspace.user_role }}</span>
            </div>
          </div>
        </div>
        <div class="dropdown-footer">
          <button class="manage-workspaces-btn" (click)="goToWorkspaceManagement()">
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

    .current-workspace {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 200px;
    }

    .current-workspace:hover {
      background: #f1f5f9;
      border-color: #d1d5db;
    }

    .workspace-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .workspace-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .workspace-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .workspace-name {
      font-weight: 600;
      color: #374151;
    }

    .workspace-count {
      font-size: 12px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 12px;
      margin-left: 8px;
    }

    .dropdown-arrow {
      margin-left: 4px;
      font-size: 12px;
      color: #6b7280;
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      min-width: 250px;
      max-width: 350px;
    }

    .dropdown-header {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
      color: #374151;
    }

    .dropdown-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .workspace-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .workspace-item:hover {
      background-color: #f8fafc;
    }

    .workspace-item.active {
      background-color: #e3f2fd;
      color: white;
    }

    .dropdown-footer {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }

    .manage-workspaces-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      width: 100%;
    }

    .manage-workspaces-btn:hover {
      background: #2563eb;
    }

    .workspace-role {
      font-size: 10px;
      padding: 2px 6px;
      background: #6b7280;
      color: white;
      border-radius: 12px;
      margin-left: 8px;
      text-transform: uppercase;
      font-weight: 600;
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
        private router: Router
    ) {
        this.context$ = this.workspaceContextService.context$;
    }

    ngOnInit(): void {
        // Load user's workspaces
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
        this.router.navigate(['/workspaces']);
    }

    private loadUserWorkspaces(): void {
        // This would typically get the current tenant and then load workspaces
        // For now, we'll use a placeholder implementation
        this.workspaceService.getCurrentTenantWorkspaces().subscribe({
            next: (workspaces) => {
                this.workspaceContextService.setUserWorkspaces(workspaces || []);

                // Set current workspace if none is selected
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