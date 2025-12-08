import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IWorkspace, IWorkspaceMember } from '../../interfaces/workspace.interface';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="workspace-members-container">
      <div class="members-header">
        <h3>Workspace Members</h3>
        <button class="add-member-btn" (click)="showAddMemberForm = !showAddMemberForm">
          <span class="icon">+</span>
          Add Member
        </button>
      </div>

      <!-- Add Member Form -->
      <div class="add-member-form" *ngIf="showAddMemberForm">
        <div class="form-group">
          <label for="member-email">Email Address</label>
          <input 
            id="member-email" 
            type="email" 
            [(ngModel)]="newMemberEmail" 
            placeholder="Enter email address"
          />
        </div>
        
        <div class="form-group">
          <label for="member-role">Role</label>
          <select id="member-role" [(ngModel)]="newMemberRole">
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button class="save-btn" (click)="addMember()" [disabled]="!newMemberEmail">
            Add Member
          </button>
          <button class="cancel-btn" (click)="showAddMemberForm = false">
            Cancel
          </button>
        </div>
      </div>

      <!-- Members List -->
      <div class="members-list" *ngIf="!isLoading && !error">
        <div class="member-item" *ngFor="let member of members">
          <div class="member-info">
            <div class="member-avatar">
              {{ member.name.charAt(0).toUpperCase() }}
            </div>
            <div class="member-details">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-email">{{ member.email }}</div>
            </div>
          </div>
          
          <div class="member-role">
            <span class="role-badge" [class.admin]="member.role === 'admin'" 
                                     [class.member]="member.role === 'member'" 
                                     [class.viewer]="member.role === 'viewer'">
              {{ member.role }}
            </span>
          </div>
          
          <div class="member-actions" *ngIf="canManageMembers">
            <button class="role-btn" (click)="editMemberRole(member)">
              Change Role
            </button>
            <button class="remove-btn" (click)="removeMember(member)">
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="isLoading">
        <div class="loading-spinner">Loading members...</div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="error">
        <div class="error-message">
          <span class="icon">⚠️</span>
          {{ error }}
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && !error && members.length === 0">
        <div class="empty-icon">👥</div>
        <h4>No Members Yet</h4>
        <p>Add team members to collaborate on this workspace.</p>
      </div>
    </div>
  `,
  styles: [`
    .workspace-members-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .members-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .members-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #374151;
    }
    
    .add-member-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .add-member-btn:hover {
      background: #2563eb;
    }
    
    .add-member-form {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      font-weight: 500;
      margin-bottom: 8px;
      color: #374151;
      font-size: 14px;
    }
    
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .form-actions {
      display: flex;
      gap: 12px;
    }
    
    .save-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .save-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    
    .cancel-btn {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 10px 16px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .members-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .member-item {
      display: flex;
      align-items: center;
      padding: 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      transition: box-shadow 0.2s ease;
    }
    
    .member-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .member-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    
    .member-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: #6b7280;
    }
    
    .member-details {
      flex: 1;
    }
    
    .member-name {
      font-weight: 600;
      color: #374151;
    }
    
    .member-email {
      font-size: 14px;
      color: #6b7280;
    }
    
    .member-role {
      margin-right: 16px;
    }
    
    .role-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    
    .role-badge.admin {
      background: #fef3c7;
      color: #92400e;
    }
    
    .role-badge.member {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .role-badge.viewer {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .member-actions {
      display: flex;
      gap: 8px;
    }
    
    .role-btn,
    .remove-btn {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      border: none;
    }
    
    .role-btn {
      background: #f3f4f6;
      color: #374151;
    }
    
    .remove-btn {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .loading-state,
    .error-state,
    .empty-state {
      text-align: center;
      padding: 40px 20px;
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
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .empty-state h4 {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px;
    }
    
    .empty-state p {
      color: #6b7280;
      font-size: 14px;
      margin: 0;
    }
  `]
})
export class WorkspaceMembersComponent implements OnInit {
  @Input() workspace: IWorkspace | null = null;
  @Output() memberAdded = new EventEmitter<IWorkspaceMember>();
  @Output() memberRemoved = new EventEmitter<string>();
  @Output() memberRoleUpdated = new EventEmitter<{ userId: string, role: string }>();

  members: IWorkspaceMember[] = [];
  isLoading = false;
  error: string | null = null;
  showAddMemberForm = false;
  newMemberEmail = '';
  newMemberRole = 'member';
  canManageMembers = false;

  constructor(private workspaceService: WorkspaceService) { }

  ngOnInit(): void {
    this.loadMembers();
    this.checkPermissions();
  }

  loadMembers(): void {
    if (!this.workspace) return;

    this.isLoading = true;
    this.error = null;

    this.workspaceService.getWorkspaceMembers(this.workspace.id).subscribe({
      next: (members) => {
        this.members = members || [];
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load workspace members';
        this.isLoading = false;
      }
    });
  }

  checkPermissions(): void {
    // Check if current user can manage members
    // This would typically come from the workspace context or user role
    this.canManageMembers = this.workspace?.user_role === 'admin';
  }

  addMember(): void {
    if (!this.workspace || !this.newMemberEmail) return;

    this.workspaceService.addWorkspaceMember(this.workspace.id, {
      email: this.newMemberEmail,
      role: this.newMemberRole
    }).subscribe({
      next: (response) => {
        this.memberAdded.emit(response.user);
        this.loadMembers();
        this.resetForm();
      },
      error: (error) => {
        this.error = 'Failed to add member';
      }
    });
  }

  removeMember(member: IWorkspaceMember): void {
    if (!this.workspace) return;

    if (confirm(`Are you sure you want to remove ${member.name} from this workspace?`)) {
      this.workspaceService.removeWorkspaceMember(this.workspace.id, member.id).subscribe({
        next: () => {
          this.memberRemoved.emit(member.id);
          this.loadMembers();
        },
        error: (error) => {
          this.error = 'Failed to remove member';
        }
      });
    }
  }

  editMemberRole(member: IWorkspaceMember): void {
    const newRole = prompt(`Change role for ${member.name}:`, member.role);

    if (newRole && newRole !== member.role && ['admin', 'member', 'viewer'].includes(newRole)) {
      this.workspaceService.updateWorkspaceMemberRole(this.workspace!.id, member.id, newRole).subscribe({
        next: () => {
          this.memberRoleUpdated.emit({ userId: member.id, role: newRole });
          this.loadMembers();
        },
        error: (error) => {
          this.error = 'Failed to update member role';
        }
      });
    }
  }

  resetForm(): void {
    this.newMemberEmail = '';
    this.newMemberRole = 'member';
    this.showAddMemberForm = false;
  }
}