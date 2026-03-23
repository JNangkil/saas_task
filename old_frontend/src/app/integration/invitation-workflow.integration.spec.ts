import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { InvitationService } from '../services/invitation.service';
import { WorkspaceMemberService } from '../services/workspace-member.service';
import { WorkspaceMembersComponent } from '../components/workspace-members/workspace-members.component';
import { InviteMemberModalComponent } from '../components/invite-member-modal/invite-member-modal.component';
import {
    IWorkspaceMember,
    IUserPermissions,
    IMemberListResponse
} from '../interfaces/workspace-member.interface';
import {
    IInvitation,
    IInvitationListResponse,
    ICreateInvitationRequest
} from '../interfaces/invitation.interface';
import { IWorkspace } from '../interfaces/workspace.interface';

describe('Invitation Workflow Integration Tests', () => {
    let httpMock: HttpTestingController;
    let invitationService: InvitationService;
    let workspaceMemberService: WorkspaceMemberService;
    let router: jasmine.SpyObj<Router>;
    let fixture: ComponentFixture<WorkspaceMembersComponent>;
    let component: WorkspaceMembersComponent;

    const mockWorkspace: IWorkspace = {
        id: '1',
        name: 'Test Workspace',
        description: 'A test workspace for integration testing',
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
            name: 'Workspace Owner',
            email: 'owner@example.com',
            role: 'owner',
            joined_at: '2024-01-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
        },
        {
            id: '2',
            workspace_id: '1',
            user_id: '2',
            name: 'Team Admin',
            email: 'admin@example.com',
            role: 'admin',
            joined_at: '2024-01-02T00:00:00Z',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z'
        }
    ];

    const mockPermissions: IUserPermissions = {
        workspace_id: '1',
        user_id: '1',
        permissions: {
            can_view: true,
            can_edit: true,
            can_delete: true,
            can_manage_members: true,
            can_manage_settings: true,
            can_invite_members: true,
            can_transfer_ownership: true
        },
        role: 'owner'
    };

    beforeEach(async () => {
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                ReactiveFormsModule,
                FormsModule,
                NoopAnimationsModule,
                WorkspaceMembersComponent
            ],
            providers: [
                { provide: Router, useValue: routerSpy }
            ]
        }).compileComponents();

        httpMock = TestBed.inject(HttpTestingController);
        invitationService = TestBed.inject(InvitationService);
        workspaceMemberService = TestBed.inject(WorkspaceMemberService);
        router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

        fixture = TestBed.createComponent(WorkspaceMembersComponent);
        component = fixture.componentInstance;
        component.workspace = mockWorkspace;

        fixture.detectChanges();
    });

    afterEach(() => {
        httpMock.verify();
    });

    describe('Complete Invitation Workflow', () => {
        it('should handle end-to-end invitation creation and acceptance', () => {
            // Step 1: Load initial data
            const memberListResponse: IMemberListResponse = {
                members: mockMembers,
                total: 2,
                page: 1,
                per_page: 20
            };

            const memberListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/members`);
            expect(memberListReq.request.method).toBe('GET');
            memberListReq.flush({ data: memberListResponse });

            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            expect(permissionsReq.request.method).toBe('GET');
            permissionsReq.flush({ data: mockPermissions });

            const invitationListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            expect(invitationListReq.request.method).toBe('GET');
            invitationListReq.flush({ data: { invitations: [], total: 0, page: 1, per_page: 15 } });

            fixture.detectChanges();

            // Step 2: Create invitation
            const invitationData: ICreateInvitationRequest = {
                email: 'newmember@example.com',
                role: 'member',
                message: 'Welcome to our workspace!'
            };

            const createdInvitation: IInvitation = {
                id: '1',
                workspace_id: mockWorkspace.id,
                email: invitationData.email,
                role: invitationData.role,
                token: 'test-invitation-token',
                status: 'pending',
                invited_by: '1',
                invited_by_user: {
                    id: '1',
                    name: 'Workspace Owner',
                    email: 'owner@example.com'
                },
                expires_at: '2024-12-31T23:59:59Z',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };

            component.openInviteModal();
            fixture.detectChanges();

            // Fill invitation form
            component.inviteForm.setValue(invitationData);
            fixture.detectChanges();

            // Send invitation
            const createInvitationReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            expect(createInvitationReq.request.method).toBe('POST');
            expect(createInvitationReq.request.body).toEqual(invitationData);
            createInvitationReq.flush({ data: createdInvitation });

            // Reload invitations after creation
            const updatedInvitationListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            updatedInvitationListReq.flush({
                data: {
                    invitations: [createdInvitation],
                    total: 1,
                    page: 1,
                    per_page: 15
                }
            });

            fixture.detectChanges();

            // Verify invitation appears in list
            expect(component.invitations).toContain(createdInvitation);
            expect(component.showInviteModal).toBe(false);
        });

        it('should handle invitation acceptance workflow for existing user', () => {
            const invitationToken = 'test-invitation-token';
            const invitationDetails = {
                invitation: {
                    id: '1',
                    workspace_id: '1',
                    email: 'existinguser@example.com',
                    role: 'member',
                    token: invitationToken,
                    status: 'pending',
                    invited_by: '1',
                    expires_at: '2024-12-31T23:59:59Z',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                },
                workspace: mockWorkspace,
                invited_by_user: {
                    id: '1',
                    name: 'Workspace Owner',
                    email: 'owner@example.com'
                }
            };

            // Step 1: Get invitation details
            const detailsReq = httpMock.expectOne(`/api/invitations/${invitationToken}`);
            expect(detailsReq.request.method).toBe('GET');
            detailsReq.flush({ data: invitationDetails });

            // Step 2: Accept invitation
            const acceptReq = httpMock.expectOne(`/api/invitations/${invitationToken}/accept`);
            expect(acceptReq.request.method).toBe('POST');
            expect(acceptReq.request.body).toEqual({});
            acceptReq.flush({
                data: {
                    message: 'Invitation accepted successfully',
                    workspace: mockWorkspace
                }
            });

            // Verify acceptance was successful
            invitationService.getInvitationByToken(invitationToken).subscribe(result => {
                expect(result.invitation.email).toBe('existinguser@example.com');
            });

            invitationService.acceptInvitation(invitationToken).subscribe(result => {
                expect(result.message).toBe('Invitation accepted successfully');
            });
        });

        it('should handle invitation acceptance workflow for new user registration', () => {
            const invitationToken = 'test-invitation-token';
            const invitationDetails = {
                invitation: {
                    id: '1',
                    workspace_id: '1',
                    email: 'newuser@example.com',
                    role: 'member',
                    token: invitationToken,
                    status: 'pending',
                    invited_by: '1',
                    expires_at: '2024-12-31T23:59:59Z',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                },
                workspace: mockWorkspace,
                invited_by_user: {
                    id: '1',
                    name: 'Workspace Owner',
                    email: 'owner@example.com'
                }
            };

            const registrationData = {
                name: 'New User',
                password: 'password123',
                password_confirmation: 'password123'
            };

            // Step 1: Get invitation details
            const detailsReq = httpMock.expectOne(`/api/invitations/${invitationToken}`);
            expect(detailsReq.request.method).toBe('GET');
            detailsReq.flush({ data: invitationDetails });

            // Step 2: Accept invitation with registration
            const acceptReq = httpMock.expectOne(`/api/invitations/${invitationToken}/accept`);
            expect(acceptReq.request.method).toBe('POST');
            expect(acceptReq.request.body).toEqual(registrationData);
            acceptReq.flush({
                data: {
                    message: 'Registration successful and invitation accepted',
                    workspace: mockWorkspace
                }
            });

            // Verify registration and acceptance was successful
            invitationService.acceptInvitation(invitationToken, registrationData).subscribe(result => {
                expect(result.message).toBe('Registration successful and invitation accepted');
            });
        });
    });

    describe('Role-Based Access Control', () => {
        it('should enforce permission-based UI visibility for owners', () => {
            const ownerPermissions: IUserPermissions = {
                ...mockPermissions,
                role: 'owner',
                permissions: {
                    can_view: true,
                    can_edit: true,
                    can_delete: true,
                    can_manage_members: true,
                    can_manage_settings: true,
                    can_invite_members: true,
                    can_transfer_ownership: true
                }
            };

            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            permissionsReq.flush({ data: ownerPermissions });

            fixture.detectChanges();

            expect(component.canManageMembers).toBe(true);
            expect(component.canInviteMembers).toBe(true);
            expect(component.canTransferOwnership).toBe(true);
            expect(component.isOwner).toBe(true);
        });

        it('should enforce permission-based UI visibility for admins', () => {
            const adminPermissions: IUserPermissions = {
                ...mockPermissions,
                role: 'admin',
                permissions: {
                    can_view: true,
                    can_edit: true,
                    can_delete: false,
                    can_manage_members: true,
                    can_manage_settings: true,
                    can_invite_members: true,
                    can_transfer_ownership: false
                }
            };

            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            permissionsReq.flush({ data: adminPermissions });

            fixture.detectChanges();

            expect(component.canManageMembers).toBe(true);
            expect(component.canInviteMembers).toBe(true);
            expect(component.canTransferOwnership).toBe(false);
            expect(component.isOwner).toBe(false);
            expect(component.isAdmin).toBe(true);
        });

        it('should enforce permission-based UI visibility for members', () => {
            const memberPermissions: IUserPermissions = {
                ...mockPermissions,
                role: 'member',
                permissions: {
                    can_view: true,
                    can_edit: true,
                    can_delete: false,
                    can_manage_members: false,
                    can_manage_settings: false,
                    can_invite_members: false,
                    can_transfer_ownership: false
                }
            };

            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            permissionsReq.flush({ data: memberPermissions });

            fixture.detectChanges();

            expect(component.canManageMembers).toBe(false);
            expect(component.canInviteMembers).toBe(false);
            expect(component.canTransferOwnership).toBe(false);
            expect(component.isOwner).toBe(false);
            expect(component.isAdmin).toBe(false);
        });

        it('should enforce permission-based UI visibility for viewers', () => {
            const viewerPermissions: IUserPermissions = {
                ...mockPermissions,
                role: 'viewer',
                permissions: {
                    can_view: true,
                    can_edit: false,
                    can_delete: false,
                    can_manage_members: false,
                    can_manage_settings: false,
                    can_invite_members: false,
                    can_transfer_ownership: false
                }
            };

            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            permissionsReq.flush({ data: viewerPermissions });

            fixture.detectChanges();

            expect(component.canManageMembers).toBe(false);
            expect(component.canInviteMembers).toBe(false);
            expect(component.canTransferOwnership).toBe(false);
            expect(component.isOwner).toBe(false);
            expect(component.isAdmin).toBe(false);
        });
    });

    describe('Email Notification Flow', () => {
        it('should trigger email sending when invitation is created', () => {
            const invitationData: ICreateInvitationRequest = {
                email: 'newmember@example.com',
                role: 'member',
                message: 'Welcome to our workspace!'
            };

            component.openInviteModal();
            component.inviteForm.setValue(invitationData);
            fixture.detectChanges();

            const createReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            expect(createReq.request.method).toBe('POST');
            expect(createReq.request.body).toEqual(invitationData);

            // Mock successful invitation creation (email should be sent by backend)
            createReq.flush({
                data: {
                    id: '1',
                    ...invitationData,
                    workspace_id: mockWorkspace.id,
                    token: 'test-token',
                    status: 'pending',
                    invited_by: '1'
                }
            });

            // Verify invitation was created (email sending is handled backend)
            expect(component.showInviteModal).toBe(false);
        });

        it('should handle invitation resend with email notification', () => {
            const existingInvitation: IInvitation = {
                id: '1',
                workspace_id: mockWorkspace.id,
                email: 'pending@example.com',
                role: 'member',
                token: 'test-token',
                status: 'pending',
                invited_by: '1',
                expires_at: '2024-12-31T23:59:59Z',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z'
            };

            component.invitations = [existingInvitation];
            fixture.detectChanges();

            component.resendInvitation('1');

            const resendReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations/1/resend`);
            expect(resendReq.request.method).toBe('POST');
            expect(resendReq.request.body).toEqual({});

            // Mock successful resend (email should be sent by backend)
            resendReq.flush({
                data: {
                    message: 'Invitation resent successfully',
                    invitation: existingInvitation
                }
            });

            // Verify resend was triggered (email sending is handled backend)
            expect(component.error).toBeNull();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle network errors gracefully', () => {
            // Mock network error for member loading
            const memberListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/members`);
            memberListReq.error(new ErrorEvent('Network error'));

            fixture.detectChanges();

            expect(component.isLoading).toBe(false);
            expect(component.error).toBe('Failed to load workspace members');
            expect(component.members).toEqual([]);
        });

        it('should handle permission denied errors', () => {
            // Mock 403 error for permissions
            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            permissionsReq.flush('Access denied', { status: 403, statusText: 'Forbidden' });

            fixture.detectChanges();

            expect(component.userPermissions).toBeNull();
            expect(component.canManageMembers).toBe(false);
            expect(component.canInviteMembers).toBe(false);
        });

        it('should handle expired invitations', () => {
            const expiredInvitation = {
                invitation: {
                    id: '1',
                    workspace_id: '1',
                    email: 'expired@example.com',
                    role: 'member',
                    token: 'expired-token',
                    status: 'expired',
                    invited_by: '1',
                    expires_at: '2023-12-31T23:59:59Z', // Past date
                    created_at: '2023-01-01T00:00:00Z',
                    updated_at: '2023-01-01T00:00:00Z'
                },
                workspace: mockWorkspace
            };

            const detailsReq = httpMock.expectOne(`/api/invitations/expired-token`);
            detailsReq.flush('Invitation expired', { status: 422, statusText: 'Unprocessable Entity' });

            invitationService.getInvitationByToken('expired-token').subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toContain('Failed to fetch invitation details');
                }
            });
        });

        it('should handle duplicate invitation prevention', () => {
            const invitationData: ICreateInvitationRequest = {
                email: 'existing@example.com',
                role: 'member',
                message: 'Duplicate invitation test'
            };

            component.openInviteModal();
            component.inviteForm.setValue(invitationData);
            fixture.detectChanges();

            const createReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            createReq.flush('User already has a pending invitation', {
                status: 422,
                statusText: 'Unprocessable Entity'
            });

            fixture.detectChanges();

            expect(component.error).toBe('Failed to send invitation');
            expect(component.showInviteModal).toBe(true); // Modal should stay open on error
        });
    });

    describe('Data Consistency and State Management', () => {
        it('should maintain consistent state across operations', () => {
            // Load initial data
            const memberListResponse: IMemberListResponse = {
                members: mockMembers,
                total: 2,
                page: 1,
                per_page: 20
            };

            const memberListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/members`);
            memberListReq.flush({ data: memberListResponse });

            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            permissionsReq.flush({ data: mockPermissions });

            fixture.detectChanges();

            // Verify initial state
            expect(component.members).toEqual(mockMembers);
            expect(component.userPermissions).toEqual(mockPermissions);
            expect(component.isLoading).toBe(false);

            // Add invitation
            const invitationData: ICreateInvitationRequest = {
                email: 'new@example.com',
                role: 'member'
            };

            component.openInviteModal();
            component.inviteForm.setValue(invitationData);

            const createReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            createReq.flush({
                data: {
                    id: '1',
                    ...invitationData,
                    workspace_id: mockWorkspace.id,
                    token: 'test-token',
                    status: 'pending'
                }
            });

            // Reload invitations
            const invitationListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            invitationListReq.flush({
                data: {
                    invitations: [{
                        id: '1',
                        email: 'new@example.com',
                        role: 'member',
                        status: 'pending'
                    }],
                    total: 1
                }
            });

            fixture.detectChanges();

            // Verify state consistency
            expect(component.invitations.length).toBe(1);
            expect(component.showInviteModal).toBe(false);
            expect(component.error).toBeNull();
        });

        it('should handle concurrent operations safely', () => {
            // Simulate concurrent operations
            component.loadMembers();
            component.loadInvitations();
            component.loadUserPermissions();

            const memberListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/members`);
            memberListReq.flush({ data: { members: mockMembers, total: 2, page: 1, per_page: 20 } });

            const invitationListReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/invitations`);
            invitationListReq.flush({ data: { invitations: [], total: 0, page: 1, per_page: 15 } });

            const permissionsReq = httpMock.expectOne(`/api/workspaces/${mockWorkspace.id}/permissions`);
            permissionsReq.flush({ data: mockPermissions });

            fixture.detectChanges();

            // Verify all operations completed successfully
            expect(component.isLoading).toBe(false);
            expect(component.isLoadingInvitations).toBe(false);
            expect(component.members).toEqual(mockMembers);
            expect(component.invitations).toEqual([]);
            expect(component.userPermissions).toEqual(mockPermissions);
        });
    });
});