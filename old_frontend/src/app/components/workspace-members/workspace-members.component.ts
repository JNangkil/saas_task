import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  IWorkspaceMember,
  IUserPermissions,
  IMemberListResponse
} from '../../interfaces/workspace-member.interface';
import {
  IInvitation,
  IInvitationListResponse,
  ICreateInvitationRequest
} from '../../interfaces/invitation.interface';
import { IWorkspace } from '../../interfaces/workspace.interface';
import { WorkspaceMemberService } from '../../services/workspace-member.service';
import { InvitationService } from '../../services/invitation.service';

@Component({
  selector: 'app-workspace-members',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './workspace-members.component.html',
  styleUrls: ['./workspace-members.component.css']
})
export class WorkspaceMembersComponent implements OnInit, OnDestroy {
  @Input() workspace: IWorkspace | null = null;
  @Output() memberAdded = new EventEmitter<IWorkspaceMember>();
  @Output() memberRemoved = new EventEmitter<string>();
  @Output() memberRoleUpdated = new EventEmitter<{ userId: string, role: string }>();

  // Component state
  members: IWorkspaceMember[] = [];
  invitations: IInvitation[] = [];
  userPermissions: IUserPermissions | null = null;
  isLoading = false;
  isLoadingInvitations = false;
  error: string | null = null;

  // UI state
  showInviteModal = false;
  showRoleDropdown: { [userId: string]: boolean } = {};
  showConfirmDialog = false;
  confirmDialogData: {
    title: string;
    message: string;
    action: () => void;
  } | null = null;

  // Forms
  inviteForm: FormGroup;
  roleUpdateForm: FormGroup;

  // Search/filter
  searchTerm = '';
  filterRole = 'all';

  // Unsubscribe subject
  private destroy$ = new Subject<void>();

  constructor(
    private workspaceMemberService: WorkspaceMemberService,
    private invitationService: InvitationService,
    private fb: FormBuilder
  ) {
    // Initialize forms
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['member', Validators.required],
      message: ['']
    });

    this.roleUpdateForm = this.fb.group({
      role: ['member', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.workspace) {
      this.loadMembers();
      this.loadInvitations();
      this.loadUserPermissions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Load data methods
  loadMembers(): void {
    if (!this.workspace) return;

    this.isLoading = true;
    this.error = null;

    this.workspaceMemberService.getMembers(+this.workspace.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: IMemberListResponse) => {
          this.members = response.members || [];
          this.isLoading = false;
        },
        error: (error) => {
          this.error = 'Failed to load workspace members';
          this.isLoading = false;
          console.error('Error loading members:', error);
        }
      });
  }

  loadInvitations(): void {
    if (!this.workspace) return;

    this.isLoadingInvitations = true;

    this.invitationService.getInvitations(+this.workspace.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: IInvitationListResponse) => {
          this.invitations = response.invitations || [];
          this.isLoadingInvitations = false;
        },
        error: (error) => {
          console.error('Error loading invitations:', error);
          this.isLoadingInvitations = false;
        }
      });
  }

  loadUserPermissions(): void {
    if (!this.workspace) return;

    this.workspaceMemberService.getPermissions(+this.workspace.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (permissions: IUserPermissions) => {
          this.userPermissions = permissions;
        },
        error: (error) => {
          console.error('Error loading user permissions:', error);
        }
      });
  }

  // Permission checks
  get canManageMembers(): boolean {
    return this.userPermissions?.permissions?.can_manage_members || false;
  }

  get canInviteMembers(): boolean {
    return this.userPermissions?.permissions?.can_invite_members || false;
  }

  get canTransferOwnership(): boolean {
    return this.userPermissions?.permissions?.can_transfer_ownership || false;
  }

  get isOwner(): boolean {
    return this.userPermissions?.role === 'owner';
  }

  get isAdmin(): boolean {
    return this.userPermissions?.role === 'admin';
  }

  // Member management methods
  openInviteModal(): void {
    this.showInviteModal = true;
    this.inviteForm.reset({
      email: '',
      role: 'member',
      message: ''
    });
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
  }

  sendInvitation(): void {
    if (!this.workspace || this.inviteForm.invalid) return;

    const invitationData: ICreateInvitationRequest = this.inviteForm.value;

    this.invitationService.createInvitation(+this.workspace.id, invitationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invitation: IInvitation) => {
          this.loadInvitations();
          this.closeInviteModal();
          // Show success message
        },
        error: (error) => {
          this.error = 'Failed to send invitation';
          console.error('Error sending invitation:', error);
        }
      });
  }

  cancelInvitation(invitationId: string): void {
    if (!this.workspace) return;

    this.showConfirmDialog = true;
    this.confirmDialogData = {
      title: 'Cancel Invitation',
      message: 'Are you sure you want to cancel this invitation?',
      action: () => {
        this.invitationService.cancelInvitation(+this.workspace!.id, +invitationId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadInvitations();
              this.closeConfirmDialog();
            },
            error: (error) => {
              this.error = 'Failed to cancel invitation';
              console.error('Error canceling invitation:', error);
              this.closeConfirmDialog();
            }
          });
      }
    };
  }

  resendInvitation(invitationId: string): void {
    if (!this.workspace) return;

    this.invitationService.resendInvitation(+this.workspace.id, +invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Show success message
        },
        error: (error) => {
          this.error = 'Failed to resend invitation';
          console.error('Error resending invitation:', error);
        }
      });
  }

  toggleRoleDropdown(userId: string): void {
    // Close all other dropdowns
    Object.keys(this.showRoleDropdown).forEach(id => {
      if (id !== userId) {
        this.showRoleDropdown[id] = false;
      }
    });

    // Toggle current dropdown
    this.showRoleDropdown[userId] = !this.showRoleDropdown[userId];
  }

  updateMemberRole(member: IWorkspaceMember): void {
    if (!this.workspace || !this.roleUpdateForm.valid) return;

    const newRole = this.roleUpdateForm.get('role')?.value;

    if (newRole === member.role) {
      this.toggleRoleDropdown(member.user_id);
      return;
    }

    this.workspaceMemberService.updateMemberRole(+this.workspace.id, +member.user_id, newRole)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedMember: IWorkspaceMember) => {
          // Update member in list
          const index = this.members.findIndex(m => m.user_id === member.user_id);
          if (index !== -1) {
            this.members[index] = updatedMember;
          }

          this.memberRoleUpdated.emit({ userId: member.user_id, role: newRole });
          this.toggleRoleDropdown(member.user_id);
        },
        error: (error) => {
          this.error = 'Failed to update member role';
          console.error('Error updating member role:', error);
        }
      });
  }

  removeMember(member: IWorkspaceMember): void {
    this.showConfirmDialog = true;
    this.confirmDialogData = {
      title: 'Remove Member',
      message: `Are you sure you want to remove ${member.name} from this workspace?`,
      action: () => {
        if (!this.workspace) return;

        this.workspaceMemberService.removeMember(+this.workspace.id, +member.user_id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.members = this.members.filter(m => m.user_id !== member.user_id);
              this.memberRemoved.emit(member.user_id);
              this.closeConfirmDialog();
            },
            error: (error) => {
              this.error = 'Failed to remove member';
              console.error('Error removing member:', error);
              this.closeConfirmDialog();
            }
          });
      }
    };
  }

  transferOwnership(member: IWorkspaceMember): void {
    this.showConfirmDialog = true;
    this.confirmDialogData = {
      title: 'Transfer Ownership',
      message: `Are you sure you want to transfer ownership of this workspace to ${member.name}? You will become an admin after the transfer.`,
      action: () => {
        if (!this.workspace) return;

        this.workspaceMemberService.transferOwnership(+this.workspace.id, +member.user_id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadMembers();
              this.loadUserPermissions();
              this.closeConfirmDialog();
            },
            error: (error) => {
              this.error = 'Failed to transfer ownership';
              console.error('Error transferring ownership:', error);
              this.closeConfirmDialog();
            }
          });
      }
    };
  }

  closeConfirmDialog(): void {
    this.showConfirmDialog = false;
    this.confirmDialogData = null;
  }

  // Filter and search methods
  get filteredMembers(): IWorkspaceMember[] {
    let filtered = this.members;

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term)
      );
    }

    // Filter by role
    if (this.filterRole !== 'all') {
      filtered = filtered.filter(member => member.role === this.filterRole);
    }

    return filtered;
  }

  get filteredInvitations(): IInvitation[] {
    let filtered = this.invitations;

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(invitation =>
        invitation.email.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  // Utility methods
  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'owner': return 'badge-owner';
      case 'admin': return 'badge-admin';
      case 'member': return 'badge-member';
      case 'viewer': return 'badge-viewer';
      default: return 'badge-default';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getInitials(name: string): string {
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Reset methods
  resetFilters(): void {
    this.searchTerm = '';
    this.filterRole = 'all';
  }
}