import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceListComponent } from '../../components/workspace-list/workspace-list.component';
import { WorkspaceFormComponent } from '../../components/workspace-form/workspace-form.component';
import { IWorkspace } from '../../interfaces/workspace.interface';

@Component({
    selector: 'app-workspace-management',
    standalone: true,
    imports: [CommonModule, WorkspaceListComponent, WorkspaceFormComponent],
    template: `
    <div class="workspace-management-container">
      <div class="workspace-management-header">
        <h1>Workspace Management</h1>
        <p>Manage your workspaces, create new ones, and organize your projects.</p>
      </div>
      
      <div class="workspace-management-content">
        <app-workspace-list></app-workspace-list>
        <app-workspace-form 
          *ngIf="showForm"
          [workspace]="selectedWorkspace"
          (workspaceSaved)="onWorkspaceSaved($event)">
        </app-workspace-form>
      </div>
    </div>
  `,
    styles: [`
    .workspace-management-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .workspace-management-header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .workspace-management-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #374151;
    }
    
    .workspace-management-header p {
      color: #6b7280;
      font-size: 16px;
      line-height: 1.5;
      margin: 8px 0 0 20px;
    }
    
    .workspace-management-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 30px;
    }
    
    @media (max-width: 768px) {
      .workspace-management-content {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class WorkspaceManagementComponent implements OnInit {
    selectedWorkspace: IWorkspace | null = null;
    showForm = false;

    constructor(private router: Router) { }

    ngOnInit(): void {
        // Check if we're in create or edit mode based on route
        this.router.events.subscribe(() => {
            const url = this.router.url;
            if (url.includes('/create')) {
                this.showForm = true;
            } else if (url.includes('/edit/')) {
                // In edit mode, we'd need to get the workspace ID from the route
                // For now, we'll just show the form
                this.showForm = true;
            }
        });
    }

    onWorkspaceSaved(workspace: IWorkspace): void {
        this.selectedWorkspace = null;
        this.showForm = false;

        // Navigate back to workspace list after saving
        this.router.navigate(['/workspaces']);
    }
}