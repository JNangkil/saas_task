import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceListComponent } from '../../components/workspace-list/workspace-list.component';
import { WorkspaceFormComponent } from '../../components/workspace-form/workspace-form.component';
import { WorkspaceMembersComponent } from '../../components/workspace-members/workspace-members.component';
import { InviteMemberModalComponent } from '../../components/invite-member-modal/invite-member-modal.component';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { IWorkspace } from '../../interfaces/workspace.interface';
import { IWorkspaceMember } from '../../interfaces/workspace-member.interface';
import { IInvitation } from '../../interfaces/invitation.interface';
import { WorkspaceContextService } from '../../services/workspace-context.service';

@Component({
  selector: 'app-workspace-management',
  standalone: true,
  imports: [
    CommonModule,
    WorkspaceListComponent,
    WorkspaceFormComponent,
    WorkspaceMembersComponent,
    InviteMemberModalComponent,
    HasPermissionDirective
  ],
  template: `
  <div class="workspace-management-container">
    <div class="workspace-management-header">
      <h1>Workspace Management</h1>
      <p>Manage your workspaces, create new ones, and organize your projects.</p>
    </div>
    
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        class="tab-button"
        [class.active]="activeTab === 'workspaces'"
        (click)="switchTab('workspaces')">
        Workspaces
      </button>
      <button
        class="tab-button"
        [class.active]="activeTab === 'members'"
        (click)="switchTab('members')">
        Members
      </button>
    </div>
    
    <div class="workspace-management-content">
      <!-- Workspaces Tab -->
      <div *ngIf="activeTab === 'workspaces'" class="tab-content">
        <app-workspace-list></app-workspace-list>
        <app-workspace-form
          *ngIf="showForm"
          [workspace]="selectedWorkspace"
          (workspaceSaved)="onWorkspaceSaved($event)">
        </app-workspace-form>
      </div>
      
      <!-- Members Tab -->
      <div *ngIf="activeTab === 'members'" class="tab-content">
        <div class="members-tab-header">
          <h2>Workspace Members</h2>
          <button
            *ngIf="selectedWorkspaceForMembers"
            class="invite-button"
            hasPermission="can_invite_members"
            (click)="openInviteModal()">
            Invite Members
          </button>
        </div>
        
        <div *ngIf="!selectedWorkspaceForMembers" class="no-workspace-selected">
          <p>Please select a workspace from the Workspaces tab to manage members.</p>
        </div>
        
        <app-workspace-members
          *ngIf="selectedWorkspaceForMembers"
          [workspace]="selectedWorkspaceForMembers"
          (memberAdded)="onMemberAdded($event)"
          (memberRemoved)="onMemberRemoved($event)"
          (memberRoleUpdated)="onMemberRoleUpdated($event)">
        </app-workspace-members>
      </div>
    </div>
    
    <!-- Invite Member Modal -->
    <app-invite-member-modal
      *ngIf="showInviteModal && selectedWorkspaceForMembers"
      [workspaceId]="selectedWorkspaceForMembers.id"
      [isVisible]="showInviteModal"
      (close)="closeInviteModal()"
      (invitationSent)="onInvitationSent($event)"
      (error)="handleInvitationError($event)">
    </app-invite-member-modal>
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
  
  .tab-navigation {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 30px;
  }
  
  .tab-button {
    background: none;
    border: none;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
  }
  
  .tab-button:hover {
    color: #374151;
  }
  
  .tab-button.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }
  
  .tab-content {
    min-height: 400px;
  }
  
  .members-tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .members-tab-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #374151;
  }
  
  .invite-button {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .invite-button:hover {
    background: #2563eb;
  }
  
  .no-workspace-selected {
    text-align: center;
    padding: 60px 20px;
    color: #6b7280;
  }
  
  .no-workspace-selected p {
    font-size: 16px;
    margin: 0;
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
    
    .tab-navigation {
      flex-direction: column;
      border-bottom: none;
      border-right: 1px solid #e5e7eb;
      margin-right: 20px;
    }
    
    .tab-button {
      border-bottom: none;
      border-right: 2px solid transparent;
      text-align: left;
    }
    
    .tab-button.active {
      border-right-color: #3b82f6;
      border-bottom-color: transparent;
    }
    
    .members-tab-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }
  }
`]
})
export class WorkspaceManagementComponent implements OnInit {
  selectedWorkspace: IWorkspace | null = null;
  showForm = false;
  activeTab: 'workspaces' | 'members' = 'workspaces';
  selectedWorkspaceForMembers: IWorkspace | null = null;
  showInviteModal = false;

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

  // Tab management
  switchTab(tab: 'workspaces' | 'members'): void {
    this.activeTab = tab;
  }

  // Workspace selection for members tab
  selectWorkspaceForMembers(workspace: IWorkspace): void {
    this.selectedWorkspaceForMembers = workspace;
    this.activeTab = 'members';
  }

  // Invitation modal management
  openInviteModal(): void {
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  // Handle invitation sent event
  onInvitationSent(invitations: IInvitation[]): void {
    this.closeInviteModal();
    // The WorkspaceMembersComponent will automatically refresh its invitations
  }

  // Handle member events
  onMemberAdded(member: IWorkspaceMember): void {
    // Member was added, the WorkspaceMembersComponent will handle the update
  }

  onMemberRemoved(memberId: string): void {
    // Member was removed, the WorkspaceMembersComponent will handle the update
  }

  onMemberRoleUpdated(event: { userId: string, role: string }): void {
    // Member role was updated, the WorkspaceMembersComponent will handle the update
  }

  handleInvitationError(error: string): void {
    console.error('Invitation error:', error);
    // Could show a toast notification here
  }
}