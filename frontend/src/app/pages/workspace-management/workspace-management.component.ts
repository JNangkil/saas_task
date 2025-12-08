import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WorkspaceListComponent } from '../../components/workspace-list/workspace-list.component';
import { WorkspaceFormComponent } from '../../components/workspace-form/workspace-form.component';
import { WorkspaceMembersComponent } from '../../components/workspace-members/workspace-members.component';
import { InviteMemberModalComponent } from '../../components/invite-member-modal/invite-member-modal.component';
import { IWorkspace } from '../../interfaces/workspace.interface';
import { IWorkspaceMember } from '../../interfaces/workspace-member.interface';
import { IInvitation } from '../../interfaces/invitation.interface';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-workspace-management',
  standalone: true,
  imports: [
    CommonModule,
    WorkspaceListComponent,
    WorkspaceFormComponent,
    WorkspaceMembersComponent,
    InviteMemberModalComponent
  ],
  template: `
  <div class="workspace-management-container">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>Workspace Management</h1>
        <p>Manage your workspaces, invite team members, and configure settings</p>
      </div>
    </div>
    
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        class="tab-button"
        [class.active]="activeTab === 'workspaces'"
        (click)="switchTab('workspaces')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        Workspaces
      </button>
      <button
        class="tab-button"
        [class.active]="activeTab === 'members'"
        (click)="switchTab('members')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M1 16C1 12.6863 3.68629 10 7 10C10.3137 10 13 12.6863 13 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="13" cy="6" r="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M17 16C17 13.7909 15.2091 12 13 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Members
      </button>
    </div>
    
    <div class="tab-content">
      <!-- Workspaces Tab -->
      <div *ngIf="activeTab === 'workspaces'" class="tab-panel animate-fade-in">
        <app-workspace-list></app-workspace-list>
        <app-workspace-form
          *ngIf="showForm"
          [workspace]="selectedWorkspace"
          (workspaceSaved)="onWorkspaceSaved($event)">
        </app-workspace-form>
      </div>
      
      <!-- Members Tab -->
      <div *ngIf="activeTab === 'members'" class="tab-panel animate-fade-in">
        <div *ngIf="!selectedWorkspaceForMembers" class="no-workspace-selected">
          <div class="empty-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
              <circle cx="24" cy="28" r="6" stroke="currentColor" stroke-width="2"/>
              <circle cx="40" cy="28" r="4" stroke="currentColor" stroke-width="2"/>
              <path d="M14 48C14 40 18 36 24 36C30 36 34 40 34 48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M50 48C50 42 46 40 40 40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Select a Workspace</h3>
          <p>Choose a workspace from the Workspaces tab to manage its members and invitations.</p>
          <button class="switch-tab-btn" (click)="switchTab('workspaces')">
            Go to Workspaces
          </button>
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
    padding: 32px;
    max-width: 1280px;
    margin: 0 auto;
    min-height: 100vh;
    background: var(--slate-50, #f8fafc);
  }
  
  /* Page Header */
  .page-header {
    margin-bottom: 32px;
  }
  
  .header-content h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
    color: var(--slate-800, #1e293b);
    background: linear-gradient(135deg, var(--slate-800, #1e293b) 0%, var(--slate-600, #475569) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .header-content p {
    margin: 10px 0 0;
    font-size: 16px;
    color: var(--slate-500, #64748b);
  }
  
  /* Tab Navigation */
  .tab-navigation {
    display: flex;
    gap: 8px;
    margin-bottom: 28px;
    background: white;
    padding: 6px;
    border-radius: var(--radius-xl, 16px);
    box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1));
    border: 1px solid var(--slate-100, #f1f5f9);
    width: fit-content;
  }
  
  .tab-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    padding: 12px 24px;
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
    min-height: 500px;
  }
  
  .tab-panel {
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  /* No Workspace Selected */
  .no-workspace-selected {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 80px 20px;
    background: white;
    border-radius: var(--radius-xl, 16px);
    border: 1px solid var(--slate-100, #f1f5f9);
  }
  
  .no-workspace-selected .empty-icon {
    color: var(--slate-300, #cbd5e1);
    margin-bottom: 24px;
  }
  
  .no-workspace-selected h3 {
    margin: 0 0 12px;
    font-size: 20px;
    font-weight: 600;
    color: var(--slate-700, #334155);
  }
  
  .no-workspace-selected p {
    margin: 0 0 28px;
    font-size: 15px;
    color: var(--slate-500, #64748b);
    max-width: 400px;
    line-height: 1.6;
  }
  
  .switch-tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
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
  
  .switch-tab-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .workspace-management-container {
      padding: 20px 16px;
    }
    
    .header-content h1 {
      font-size: 26px;
    }
    
    .tab-navigation {
      width: 100%;
      justify-content: stretch;
    }
    
    .tab-button {
      flex: 1;
      justify-content: center;
      padding: 10px 16px;
    }
    
    .tab-button span {
      display: none;
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

  constructor(
    private router: Router,
    private workspaceContextService: WorkspaceContextService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Subscribe to current workspace changes
    this.workspaceContextService.context$.subscribe(context => {
      if (context.currentWorkspace) {
        this.selectedWorkspaceForMembers = context.currentWorkspace;
      }
    });

    // Check if we're in create or edit mode based on route
    this.router.events.subscribe(() => {
      const url = this.router.url;
      if (url.includes('/create')) {
        this.showForm = true;
      } else if (url.includes('/edit/')) {
        this.showForm = true;
      }
    });
  }

  onWorkspaceSaved(workspace: IWorkspace): void {
    this.selectedWorkspace = null;
    this.showForm = false;
    this.toastService.success(`Workspace "${workspace.name}" saved successfully!`);
    this.router.navigate(['/workspaces']);
  }

  switchTab(tab: 'workspaces' | 'members'): void {
    this.activeTab = tab;
  }

  selectWorkspaceForMembers(workspace: IWorkspace): void {
    this.selectedWorkspaceForMembers = workspace;
    this.activeTab = 'members';
  }

  openInviteModal(): void {
    this.showInviteModal = true;
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  onInvitationSent(invitations: IInvitation[]): void {
    this.closeInviteModal();
    const count = invitations.length;
    this.toastService.success(
      `${count} invitation${count > 1 ? 's' : ''} sent successfully!`,
      'Invitations Sent'
    );
  }

  onMemberAdded(member: IWorkspaceMember): void {
    this.toastService.success(`${member.name} added to workspace`);
  }

  onMemberRemoved(memberId: string): void {
    this.toastService.info('Member removed from workspace');
  }

  onMemberRoleUpdated(event: { userId: string, role: string }): void {
    this.toastService.success(`Role updated to ${event.role}`);
  }

  handleInvitationError(error: string): void {
    this.toastService.error(error, 'Invitation Failed');
  }
}