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
    <div class="workspace-list-container">
      <div class="workspace-list-header">
        <h2>Workspaces</h2>
        <button class="create-workspace-btn" (click)="createWorkspace()">
          <span class="icon">+</span>
          Create Workspace
        </button>
      </div>
      
      <div class="workspace-list-content" *ngIf="isLoading">
        <div class="loading-spinner">Loading workspaces...</div>
      </div>
      
      <div class="workspace-list-content" *ngIf="error">
        <div class="error-message">
          <span class="icon">⚠️</span>
          {{ error }}
        </div>
      </div>
      
      <div class="workspace-list-content" *ngIf="!isLoading && !error">
        <div class="workspace-grid" *ngIf="workspaces.length > 0">
          <div 
            class="workspace-card" 
            *ngFor="let workspace of workspaces" 
            [class.active]="workspace.id === currentWorkspace?.id"
            (click)="selectWorkspace(workspace)">
            <div class="workspace-header">
              <div class="workspace-icon" [style.color]="workspace.color">
                {{ workspace.icon || '🏢' }}
              </div>
              <div class="workspace-info">
                <h3>{{ workspace.name }}</h3>
                <p class="workspace-description">{{ workspace.description || 'No description' }}</p>
                <div class="workspace-meta">
                  <span class="member-count">{{ workspace.member_count || 0 }} members</span>
                  <span class="workspace-role" *ngIf="workspace.user_role">{{ workspace.user_role }}</span>
                </div>
              </div>
            </div>
            <div class="workspace-actions" *ngIf="workspace.user_role === 'admin'">
              <button class="edit-btn" (click)="editWorkspace(workspace)">Edit</button>
              <button class="archive-btn" (click)="archiveWorkspace(workspace)" 
                      *ngIf="!workspace.is_archived">Archive</button>
              <button class="restore-btn" (click)="restoreWorkspace(workspace)" 
                      *ngIf="workspace.is_archived">Restore</button>
            </div>
          </div>
        </div>
        
        <div class="empty-state" *ngIf="workspaces.length === 0">
          <div class="empty-icon">🏢</div>
          <h3>No Workspaces Yet</h3>
          <p>Create your first workspace to get started with organizing your projects.</p>
          <button class="create-first-workspace-btn" (click)="createWorkspace()">
            Create Your First Workspace
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workspace-list-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .workspace-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .workspace-list-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #374151;
    }
    
    .create-workspace-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .create-workspace-btn:hover {
      background: #2563eb;
    }
    
    .workspace-list-content {
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
    
    .workspace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .workspace-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }
    
    .workspace-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
    
    .workspace-card.active {
      border-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }
    
    .workspace-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .workspace-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .workspace-info {
      flex: 1;
    }
    
    .workspace-info h3 {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 600;
      color: #374151;
    }
    
    .workspace-description {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }
    
    .workspace-meta {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    
    .member-count {
      background: #f3f4f6;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .workspace-role {
      background: #6b7280;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
    }
    
    .workspace-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    
    .edit-btn, .archive-btn, .restore-btn {
      padding: 6px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .edit-btn {
      background: #f3f4f6;
      color: #374151;
    }
    
    .edit-btn:hover {
      background: #e5e7eb;
    }
    
    .archive-btn {
      background: #f59e0b;
      color: white;
    }
    
    .archive-btn:hover {
      background: #dc2626;
    }
    
    .restore-btn {
      background: #10b981;
      color: white;
    }
    
    .restore-btn:hover {
      background: #059669;
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .empty-state h3 {
      font-size: 20px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 16px;
    }
    
    .empty-state p {
      color: #6b7280;
      font-size: 16px;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    
    .create-first-workspace-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .create-first-workspace-btn:hover {
      background: #2563eb;
    }
  `]
})
export class WorkspaceListComponent implements OnInit {
  workspaces: IWorkspace[] = [];
  currentWorkspace: IWorkspace | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(
    private workspaceService: WorkspaceService,
    private workspaceContextService: WorkspaceContextService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.isLoading = true;
    this.error = null;

    this.workspaceService.getCurrentTenantWorkspaces().subscribe({
      next: (workspaces) => {
        this.workspaces = workspaces;
        this.isLoading = false;

        // Set current workspace if none is selected
        if (!this.workspaceContextService.context.currentWorkspace && workspaces.length > 0) {
          this.workspaceContextService.setCurrentWorkspace(workspaces[0]);
        }
        this.currentWorkspace = this.workspaceContextService.context.currentWorkspace;
      },
      error: (error) => {
        this.error = 'Failed to load workspaces';
        this.isLoading = false;
      }
    });
  }

  selectWorkspace(workspace: IWorkspace): void {
    this.workspaceContextService.setCurrentWorkspace(workspace);
  }

  createWorkspace(): void {
    this.router.navigate(['/workspaces/create']);
  }

  editWorkspace(workspace: IWorkspace): void {
    this.router.navigate(['/workspaces', workspace.id, 'edit']);
  }

  archiveWorkspace(workspace: IWorkspace): void {
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
}