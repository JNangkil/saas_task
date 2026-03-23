import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule, FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { WorkspaceMembersComponent } from './workspace-members.component';
import { WorkspaceMemberService } from '../../services/workspace-member.service';
import { InvitationService } from '../../services/invitation.service';
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

describe('WorkspaceMembersComponent', () => {
    let component: WorkspaceMembersComponent;
    let fixture: ComponentFixture<WorkspaceMembersComponent>;
    let workspaceMemberService: jasmine.SpyObj<WorkspaceMemberService>;
    let invitationService: jasmine.SpyObj<InvitationService>;
    let formBuilder: FormBuilder;

    const mockWorkspace: IWorkspace = {
        id: '1',
        name: 'Test Workspace',
        description: 'A test workspace',
        tenant_id: '1',
        color: '#3B82F6',
        icon: '🏢',
        is_archived: false,
        is_default: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    };

    const mockMembers: IWorkspaceMember[] = [
        {
            id: '1',
            workspace_id: '1',
            user_id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'owner',
            joined_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        },
        {
            id: '2',
            workspace_id: '1',
            user_id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'admin',
            joined_at: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z'
        },
        {
            id: '3',
            workspace_id: '1',
            user_id: '3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            role: 'member',
            joined_at: '2024-01-03T00:00:00Z',
            created_at: '2024-01-03T00:00:00Z',
            updated_at: '2024-01-03T00:00:00Z'
        }
    ];

    const mockInvitations: IInvitation[] = [
        {
            id: '1',
            workspace_id: '1',
            email: 'invitee@example.com',
            role: 'member',
            token: 'test-token',
            status: 'pending',
            invited_by: '1',
            invited_by_user: {
                id: '1',
                name: 'John Doe',
                email: 'john@example.com'
            },
            expires_at: '2024-12-31T23:59:59Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        }
    ];

    const mockPermissions: IUserPermissions = {
        workspace_id: '1',
        user_id: '1',
        permissions: {
            can_view: true,
            can_edit: true,
            can_delete: false,
            can_manage_members: true,
            can_manage_settings: true,
            can_invite_members: true,
            can_transfer_ownership: false
        },
        role: 'admin'
    };

    const mockMemberListResponse: IMemberListResponse = {
        members: mockMembers,
        total: 3,
        page: 1,
        per_page: 20
    };

    const mockInvitationListResponse: IInvitationListResponse = {
        invitations: mockInvitations,
        total: 1,
        page: 1,
        per_page: 15
    };

    beforeEach(async () => {
        const workspaceMemberServiceSpy = jasmine.createSpyObj('WorkspaceMemberService', [
            'getMembers', 'updateMemberRole', 'removeMember', 'getPermissions', 'transferOwnership'
        ]);
        const invitationServiceSpy = jasmine.createSpyObj('InvitationService', [
            'getInvitations', 'createInvitation', 'cancelInvitation', 'resendInvitation'
        ]);

        await TestBed.configureTestingModule({
            imports: [
                ReactiveFormsModule,
                FormsModule,
                NoopAnimationsModule,
                WorkspaceMembersComponent
            ],
            providers: [
                FormBuilder,
                { provide: WorkspaceMemberService, useValue: workspaceMemberServiceSpy },
                { provide: InvitationService, useValue: invitationServiceSpy }
            ]
        }).compileComponents();

        workspaceMemberService = TestBed.inject(WorkspaceMemberService) as jasmine.SpyObj<WorkspaceMemberService>;
        invitationService = TestBed.inject(InvitationService) as jasmine.SpyObj<InvitationService>;
        formBuilder = TestBed.inject(FormBuilder);
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(WorkspaceMembersComponent);
        component = fixture.componentInstance;
        component.workspace = mockWorkspace;

        // Setup default spy returns
        workspaceMemberService.getMembers.and.returnValue(of(mockMemberListResponse));
        workspaceMemberService.getPermissions.and.returnValue(of(mockPermissions));
        invitationService.getInvitations.and.returnValue(of(mockInvitationListResponse));

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Component initialization', () => {
        it('should initialize with default values', () => {
            expect(component.members).toEqual([]);
            expect(component.invitations).toEqual([]);
            expect(component.userPermissions).toBeNull();
            expect(component.isLoading).toBe(false);
            expect(component.isLoadingInvitations).toBe(false);
            expect(component.error).toBeNull();
            expect(component.showInviteModal).toBe(false);
            expect(component.showConfirmDialog).toBe(false);
            expect(component.searchTerm).toBe('');
            expect(component.filterRole).toBe('all');
        });

        it('should initialize forms correctly', () => {
            expect(component.inviteForm).toBeDefined();
            expect(component.roleUpdateForm).toBeDefined();
            expect(component.inviteForm.get('email')).toBeDefined();
            expect(component.inviteForm.get('role')).toBeDefined();
            expect(component.inviteForm.get('message')).toBeDefined();
            expect(component.roleUpdateForm.get('role')).toBeDefined();
        });

        it('should load data on init when workspace is provided', () => {
            spyOn(component, 'loadMembers');
            spyOn(component, 'loadInvitations');
            spyOn(component, 'loadUserPermissions');

            component.ngOnInit();

            expect(component.loadMembers).toHaveBeenCalled();
            expect(component.loadInvitations).toHaveBeenCalled();
            expect(component.loadUserPermissions).toHaveBeenCalled();
        });

        it('should not load data on init when workspace is null', () => {
            component.workspace = null;
            spyOn(component, 'loadMembers');
            spyOn(component, 'loadInvitations');
            spyOn(component, 'loadUserPermissions');

            component.ngOnInit();

            expect(component.loadMembers).not.toHaveBeenCalled();
            expect(component.loadInvitations).not.toHaveBeenCalled();
            expect(component.loadUserPermissions).not.toHaveBeenCalled();
        });

        it('should clean up on destroy', () => {
            const nextSpy = spyOn(component['destroy$'], 'next');
            const completeSpy = spyOn(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(nextSpy).toHaveBeenCalled();
            expect(completeSpy).toHaveBeenCalled();
        });
    });

    describe('Data loading', () => {
        it('should load members successfully', () => {
            component.loadMembers();

            expect(component.isLoading).toBe(false);
            expect(component.members).toEqual(mockMembers);
            expect(component.error).toBeNull();
            expect(workspaceMemberService.getMembers).toHaveBeenCalledWith(+mockWorkspace.id);
        });

        it('should handle member loading error', () => {
            workspaceMemberService.getMembers.and.returnValue(throwError(() => new Error('Network error')));

            component.loadMembers();

            expect(component.isLoading).toBe(false);
            expect(component.members).toEqual([]);
            expect(component.error).toBe('Failed to load workspace members');
        });

        it('should load invitations successfully', () => {
            component.loadInvitations();

            expect(component.isLoadingInvitations).toBe(false);
            expect(component.invitations).toEqual(mockInvitations);
            expect(invitationService.getInvitations).toHaveBeenCalledWith(+mockWorkspace.id);
        });

        it('should handle invitation loading error', () => {
            invitationService.getInvitations.and.returnValue(throwError(() => new Error('Network error')));

            component.loadInvitations();

            expect(component.isLoadingInvitations).toBe(false);
            expect(component.invitations).toEqual([]);
        });

        it('should load user permissions successfully', () => {
            component.loadUserPermissions();

            expect(component.userPermissions).toEqual(mockPermissions);
            expect(workspaceMemberService.getPermissions).toHaveBeenCalledWith(+mockWorkspace.id);
        });

        it('should handle permissions loading error', () => {
            workspaceMemberService.getPermissions.and.returnValue(throwError(() => new Error('Network error')));

            component.loadUserPermissions();

            expect(component.userPermissions).toBeNull();
        });
    });

    describe('Permission checks', () => {
        beforeEach(() => {
            component.userPermissions = mockPermissions;
        });

        it('should correctly determine if user can manage members', () => {
            expect(component.canManageMembers).toBe(true);

            component.userPermissions!.permissions.can_manage_members = false;
            expect(component.canManageMembers).toBe(false);
        });

        it('should correctly determine if user can invite members', () => {
            expect(component.canInviteMembers).toBe(true);

            component.userPermissions!.permissions.can_invite_members = false;
            expect(component.canInviteMembers).toBe(false);
        });

        it('should correctly determine if user can transfer ownership', () => {
            expect(component.canTransferOwnership).toBe(false);

            component.userPermissions!.permissions.can_transfer_ownership = true;
            expect(component.canTransferOwnership).toBe(true);
        });

        it('should correctly determine if user is owner', () => {
            expect(component.isOwner).toBe(false);

            component.userPermissions!.role = 'owner';
            expect(component.isOwner).toBe(true);
        });

        it('should correctly determine if user is admin', () => {
            expect(component.isAdmin).toBe(true);

            component.userPermissions!.role = 'member';
            expect(component.isAdmin).toBe(false);
        });
    });

    describe('Member management', () => {
        beforeEach(() => {
            component.userPermissions = mockPermissions;
            component.members = mockMembers;
        });

        it('should open invite modal', () => {
            component.openInviteModal();

            expect(component.showInviteModal).toBe(true);
            expect(component.inviteForm.value).toEqual({
                email: '',
                role: 'member',
                message: ''
            });
        });

        it('should close invite modal', () => {
            component.showInviteModal = true;
            component.closeInviteModal();

            expect(component.showInviteModal).toBe(false);
        });

        it('should send invitation successfully', () => {
            const invitationData: ICreateInvitationRequest = {
                email: 'new@example.com',
                role: 'member',
                message: 'Please join'
            };

            component.inviteForm.setValue(invitationData);
            invitationService.createInvitation.and.returnValue(of(mockInvitations[0]));
            spyOn(component, 'loadInvitations');
            spyOn(component, 'closeInviteModal');

            component.sendInvitation();

            expect(invitationService.createInvitation).toHaveBeenCalledWith(+mockWorkspace.id, invitationData);
            expect(component.loadInvitations).toHaveBeenCalled();
            expect(component.closeInviteModal).toHaveBeenCalled();
        });

        it('should not send invitation if form is invalid', () => {
            component.inviteForm.setErrors({ email: true });
            invitationService.createInvitation.calls.reset();

            component.sendInvitation();

            expect(invitationService.createInvitation).not.toHaveBeenCalled();
        });

        it('should handle invitation sending error', () => {
            component.inviteForm.setValue({
                email: 'new@example.com',
                role: 'member',
                message: ''
            });

            invitationService.createInvitation.and.returnValue(throwError(() => new Error('Network error')));

            component.sendInvitation();

            expect(component.error).toBe('Failed to send invitation');
        });

        it('should cancel invitation with confirmation', () => {
            spyOn(component, 'closeConfirmDialog');
            spyOn(component, 'loadInvitations');

            component.cancelInvitation('1');

            expect(component.showConfirmDialog).toBe(true);
            expect(component.confirmDialogData).toBeDefined();
            expect(component.confirmDialogData!.title).toBe('Cancel Invitation');

            // Execute the action
            component.confirmDialogData!.action();

            expect(invitationService.cancelInvitation).toHaveBeenCalledWith(+mockWorkspace.id, 1);
            expect(component.loadInvitations).toHaveBeenCalled();
            expect(component.closeConfirmDialog).toHaveBeenCalled();
        });

        it('should resend invitation', () => {
            invitationService.resendInvitation.and.returnValue(of({}));

            component.resendInvitation('1');

            expect(invitationService.resendInvitation).toHaveBeenCalledWith(+mockWorkspace.id, 1);
        });

        it('should handle resend invitation error', () => {
            invitationService.resendInvitation.and.returnValue(throwError(() => new Error('Network error')));

            component.resendInvitation('1');

            expect(component.error).toBe('Failed to resend invitation');
        });
    });

    describe('Role management', () => {
        beforeEach(() => {
            component.members = mockMembers;
            component.userPermissions = mockPermissions;
        });

        it('should toggle role dropdown', () => {
            const userId = '2';
            component.showRoleDropdown = {};

            component.toggleRoleDropdown(userId);

            expect(component.showRoleDropdown[userId]).toBe(true);

            // Toggle again
            component.toggleRoleDropdown(userId);

            expect(component.showRoleDropdown[userId]).toBe(false);
        });

        it('should close other dropdowns when opening new one', () => {
            component.showRoleDropdown = { '1': true, '2': false };

            component.toggleRoleDropdown('2');

            expect(component.showRoleDropdown['1']).toBe(false);
            expect(component.showRoleDropdown['2']).toBe(true);
        });

        it('should update member role successfully', () => {
            const member = mockMembers[1]; // Jane Smith (admin)
            const newRole = 'member';

            component.roleUpdateForm.get('role')?.setValue(newRole);
            workspaceMemberService.updateMemberRole.and.returnValue(of({ ...member, role: newRole }));
            spyOn(component.memberRoleUpdated, 'emit');
            spyOn(component, 'toggleRoleDropdown');

            component.updateMemberRole(member);

            expect(workspaceMemberService.updateMemberRole).toHaveBeenCalledWith(
                +mockWorkspace.id,
                +member.user_id,
                newRole
            );

            // Check if member was updated in the list
            const updatedMember = component.members.find(m => m.user_id === member.user_id);
            expect(updatedMember?.role).toBe(newRole);

            expect(component.memberRoleUpdated).toHaveBeenCalledWith({ userId: member.user_id, role: newRole });
            expect(component.toggleRoleDropdown).toHaveBeenCalledWith(member.user_id);
        });

        it('should not update role if form is invalid', () => {
            const member = mockMembers[1];
            component.roleUpdateForm.setErrors({ role: true });
            workspaceMemberService.updateMemberRole.calls.reset();

            component.updateMemberRole(member);

            expect(workspaceMemberService.updateMemberRole).not.toHaveBeenCalled();
        });

        it('should close dropdown if role is the same', () => {
            const member = mockMembers[1]; // admin
            component.roleUpdateForm.get('role')?.setValue('admin');
            spyOn(component, 'toggleRoleDropdown');

            component.updateMemberRole(member);

            expect(component.toggleRoleDropdown).toHaveBeenCalledWith(member.user_id);
            expect(workspaceMemberService.updateMemberRole).not.toHaveBeenCalled();
        });

        it('should handle role update error', () => {
            const member = mockMembers[1];
            component.roleUpdateForm.get('role')?.setValue('member');
            workspaceMemberService.updateMemberRole.and.returnValue(throwError(() => new Error('Network error')));

            component.updateMemberRole(member);

            expect(component.error).toBe('Failed to update member role');
        });
    });

    describe('Member removal', () => {
        beforeEach(() => {
            component.members = mockMembers;
            component.userPermissions = mockPermissions;
        });

        it('should show confirmation dialog for member removal', () => {
            const member = mockMembers[2]; // Bob Johnson

            component.removeMember(member);

            expect(component.showConfirmDialog).toBe(true);
            expect(component.confirmDialogData).toBeDefined();
            expect(component.confirmDialogData!.title).toBe('Remove Member');
            expect(component.confirmDialogData!.message).toContain(member.name);
        });

        it('should remove member successfully', () => {
            const member = mockMembers[2];
            workspaceMemberService.removeMember.and.returnValue(of({}));
            spyOn(component.memberRemoved, 'emit');
            spyOn(component, 'closeConfirmDialog');

            component.removeMember(member);

            // Execute the action
            component.confirmDialogData!.action();

            expect(workspaceMemberService.removeMember).toHaveBeenCalledWith(
                +mockWorkspace.id,
                +member.user_id
            );
            expect(component.members).not.toContain(member);
            expect(component.memberRemoved).toHaveBeenCalledWith(member.user_id);
            expect(component.closeConfirmDialog).toHaveBeenCalled();
        });

        it('should handle member removal error', () => {
            const member = mockMembers[2];
            workspaceMemberService.removeMember.and.returnValue(throwError(() => new Error('Network error')));
            spyOn(component, 'closeConfirmDialog');

            component.removeMember(member);

            // Execute the action
            component.confirmDialogData!.action();

            expect(component.error).toBe('Failed to remove member');
            expect(component.closeConfirmDialog).toHaveBeenCalled();
        });
    });

    describe('Ownership transfer', () => {
        beforeEach(() => {
            component.members = mockMembers;
            component.userPermissions = { ...mockPermissions, permissions: { ...mockPermissions.permissions, can_transfer_ownership: true } };
        });

        it('should show confirmation dialog for ownership transfer', () => {
            const member = mockMembers[1]; // Jane Smith

            component.transferOwnership(member);

            expect(component.showConfirmDialog).toBe(true);
            expect(component.confirmDialogData).toBeDefined();
            expect(component.confirmDialogData!.title).toBe('Transfer Ownership');
            expect(component.confirmDialogData!.message).toContain(member.name);
        });

        it('should transfer ownership successfully', () => {
            const member = mockMembers[1];
            workspaceMemberService.transferOwnership.and.returnValue(of({}));
            spyOn(component, 'loadMembers');
            spyOn(component, 'loadUserPermissions');
            spyOn(component, 'closeConfirmDialog');

            component.transferOwnership(member);

            // Execute the action
            component.confirmDialogData!.action();

            expect(workspaceMemberService.transferOwnership).toHaveBeenCalledWith(
                +mockWorkspace.id,
                +member.user_id
            );
            expect(component.loadMembers).toHaveBeenCalled();
            expect(component.loadUserPermissions).toHaveBeenCalled();
            expect(component.closeConfirmDialog).toHaveBeenCalled();
        });

        it('should handle ownership transfer error', () => {
            const member = mockMembers[1];
            workspaceMemberService.transferOwnership.and.returnValue(throwError(() => new Error('Network error')));
            spyOn(component, 'closeConfirmDialog');

            component.transferOwnership(member);

            // Execute the action
            component.confirmDialogData!.action();

            expect(component.error).toBe('Failed to transfer ownership');
            expect(component.closeConfirmDialog).toHaveBeenCalled();
        });
    });

    describe('Filtering and searching', () => {
        beforeEach(() => {
            component.members = mockMembers;
            component.invitations = mockInvitations;
        });

        it('should filter members by search term', () => {
            component.searchTerm = 'john';

            const filtered = component.filteredMembers;

            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('John Doe');
        });

        it('should filter members by email search', () => {
            component.searchTerm = 'jane@example.com';

            const filtered = component.filteredMembers;

            expect(filtered.length).toBe(1);
            expect(filtered[0].email).toBe('jane@example.com');
        });

        it('should filter members by role', () => {
            component.filterRole = 'admin';

            const filtered = component.filteredMembers;

            expect(filtered.length).toBe(1);
            expect(filtered[0].role).toBe('admin');
        });

        it('should filter members by search and role combined', () => {
            component.searchTerm = 'jane';
            component.filterRole = 'admin';

            const filtered = component.filteredMembers;

            expect(filtered.length).toBe(1);
            expect(filtered[0].name).toBe('Jane Smith');
            expect(filtered[0].role).toBe('admin');
        });

        it('should filter invitations by search term', () => {
            component.searchTerm = 'invitee@example.com';

            const filtered = component.filteredInvitations;

            expect(filtered.length).toBe(1);
            expect(filtered[0].email).toBe('invitee@example.com');
        });

        it('should reset filters', () => {
            component.searchTerm = 'john';
            component.filterRole = 'admin';

            component.resetFilters();

            expect(component.searchTerm).toBe('');
            expect(component.filterRole).toBe('all');
        });
    });

    describe('Utility methods', () => {
        it('should get correct role badge class', () => {
            expect(component.getRoleBadgeClass('owner')).toBe('badge-owner');
            expect(component.getRoleBadgeClass('admin')).toBe('badge-admin');
            expect(component.getRoleBadgeClass('member')).toBe('badge-member');
            expect(component.getRoleBadgeClass('viewer')).toBe('badge-viewer');
            expect(component.getRoleBadgeClass('unknown')).toBe('badge-default');
        });

        it('should format date correctly', () => {
            const dateString = '2024-01-15T10:30:00Z';
            const formatted = component.formatDate(dateString);

            expect(formatted).toContain('2024');
            expect(formatted).toContain('Jan');
            expect(formatted).toContain('15');
        });

        it('should get initials from name', () => {
            expect(component.getInitials('John Doe')).toBe('JD');
            expect(component.getInitials('Jane Smith')).toBe('JS');
            expect(component.getInitials('Bob')).toBe('B');
            expect(component.getInitials('Very Long Name Here')).toBe('VL');
        });

        it('should close confirmation dialog', () => {
            component.showConfirmDialog = true;
            component.confirmDialogData = {
                title: 'Test',
                message: 'Test message',
                action: () => { }
            };

            component.closeConfirmDialog();

            expect(component.showConfirmDialog).toBe(false);
            expect(component.confirmDialogData).toBeNull();
        });
    });

    describe('Permission-based UI visibility', () => {
        it('should show invite button only when user can invite members', () => {
            component.userPermissions = { ...mockPermissions, permissions: { ...mockPermissions.permissions, can_invite_members: true } };
            fixture.detectChanges();

            const inviteButton = fixture.nativeElement.querySelector('[data-test="invite-button"]');
            expect(inviteButton).toBeTruthy();

            component.userPermissions!.permissions.can_invite_members = false;
            fixture.detectChanges();

            const hiddenButton = fixture.nativeElement.querySelector('[data-test="invite-button"]');
            expect(hiddenButton).toBeFalsy();
        });

        it('should show role dropdown only when user can manage members', () => {
            component.userPermissions = { ...mockPermissions, permissions: { ...mockPermissions.permissions, can_manage_members: true } };
            component.members = mockMembers;
            fixture.detectChanges();

            const roleDropdown = fixture.nativeElement.querySelector('[data-test="role-dropdown"]');
            expect(roleDropdown).toBeTruthy();

            component.userPermissions!.permissions.can_manage_members = false;
            fixture.detectChanges();

            const hiddenDropdown = fixture.nativeElement.querySelector('[data-test="role-dropdown"]');
            expect(hiddenDropdown).toBeFalsy();
        });

        it('should show transfer ownership option only when user can transfer ownership', () => {
            component.userPermissions = { ...mockPermissions, permissions: { ...mockPermissions.permissions, can_transfer_ownership: true } };
            component.members = mockMembers;
            fixture.detectChanges();

            const transferOption = fixture.nativeElement.querySelector('[data-test="transfer-ownership"]');
            expect(transferOption).toBeTruthy();

            component.userPermissions!.permissions.can_transfer_ownership = false;
            fixture.detectChanges();

            const hiddenOption = fixture.nativeElement.querySelector('[data-test="transfer-ownership"]');
            expect(hiddenOption).toBeFalsy();
        });
    });

    describe('Error handling and edge cases', () => {
        it('should handle null workspace gracefully', () => {
            component.workspace = null;

            expect(() => component.loadMembers()).not.toThrow();
            expect(() => component.loadInvitations()).not.toThrow();
            expect(() => component.loadUserPermissions()).not.toThrow();
        });

        it('should handle empty member list', () => {
            component.members = [];

            const filtered = component.filteredMembers;
            expect(filtered).toEqual([]);
        });

        it('should handle empty invitation list', () => {
            component.invitations = [];

            const filtered = component.filteredInvitations;
            expect(filtered).toEqual([]);
        });

        it('should handle null permissions gracefully', () => {
            component.userPermissions = null;

            expect(component.canManageMembers).toBe(false);
            expect(component.canInviteMembers).toBe(false);
            expect(component.canTransferOwnership).toBe(false);
            expect(component.isOwner).toBe(false);
            expect(component.isAdmin).toBe(false);
        });

        it('should not execute actions when confirm dialog data is null', () => {
            component.confirmDialogData = null;

            expect(() => {
                if (component.confirmDialogData) {
                    component.confirmDialogData.action();
                }
            }).not.toThrow();
        });
    });
});