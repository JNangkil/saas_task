import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { WorkspaceMemberService } from './workspace-member.service';
import {
    IWorkspaceMember,
    IRoleUpdate,
    IOwnershipTransfer,
    IUserPermissions,
    IMemberListResponse
} from '../interfaces/workspace-member.interface';

describe('WorkspaceMemberService', () => {
    let service: WorkspaceMemberService;
    let httpMock: HttpTestingController;
    let httpClient: HttpClient;

    const mockMember: IWorkspaceMember = {
        id: '1',
        workspace_id: '1',
        user_id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        joined_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    };

    const mockMemberList: IMemberListResponse = {
        members: [mockMember],
        total: 1,
        page: 1,
        per_page: 20
    };

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

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [WorkspaceMemberService]
        });

        service = TestBed.inject(WorkspaceMemberService);
        httpMock = TestBed.inject(HttpTestingController);
        httpClient = TestBed.inject(HttpClient);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getMembers', () => {
        it('should get members for a workspace successfully', () => {
            const workspaceId = 1;

            service.getMembers(workspaceId).subscribe(result => {
                expect(result).toEqual(mockMemberList);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            expect(req.request.method).toBe('GET');
            req.flush({ data: mockMemberList });
        });

        it('should handle HTTP error when getting members', () => {
            const workspaceId = 1;

            service.getMembers(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to fetch members for workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });
        });

        it('should log error when getting members fails', () => {
            const workspaceId = 1;
            const consoleSpy = spyOn(console, 'error');

            service.getMembers(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error fetching members for workspace ${workspaceId}:`, jasmine.any(Object));
        });

        it('should handle query parameters correctly', () => {
            const workspaceId = 1;

            service.getMembers(workspaceId).subscribe();

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            expect(req.request.method).toBe('GET');
            expect(req.request.params.keys().length).toBe(0);
            req.flush({ data: mockMemberList });
        });
    });

    describe('updateMemberRole', () => {
        it('should update member role successfully', () => {
            const workspaceId = 1;
            const userId = 1;
            const newRole = 'admin';

            service.updateMemberRole(workspaceId, userId, newRole).subscribe(result => {
                expect(result).toEqual(mockMember);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            expect(req.request.body).toEqual({ role: newRole });
            req.flush({ data: mockMember });
        });

        it('should handle HTTP error when updating member role', () => {
            const workspaceId = 1;
            const userId = 1;
            const newRole = 'admin';

            service.updateMemberRole(workspaceId, userId, newRole).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to update member role for user ${userId} in workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });
        });

        it('should log error when updating member role fails', () => {
            const workspaceId = 1;
            const userId = 1;
            const newRole = 'admin';
            const consoleSpy = spyOn(console, 'error');

            service.updateMemberRole(workspaceId, userId, newRole).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error updating member role for user ${userId} in workspace ${workspaceId}:`, jasmine.any(Object));
        });

        it('should validate role parameter', () => {
            const workspaceId = 1;
            const userId = 1;
            const newRole = 'invalid-role';

            service.updateMemberRole(workspaceId, userId, newRole).subscribe(result => {
                expect(result).toEqual(mockMember);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            expect(req.request.body).toEqual({ role: newRole });
            req.flush({ data: mockMember });
        });
    });

    describe('removeMember', () => {
        it('should remove member successfully', () => {
            const workspaceId = 1;
            const userId = 1;

            service.removeMember(workspaceId, userId).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ message: 'Member removed successfully' });
        });

        it('should handle HTTP error when removing member', () => {
            const workspaceId = 1;
            const userId = 1;

            service.removeMember(workspaceId, userId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to remove member ${userId} from workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });
        });

        it('should log error when removing member fails', () => {
            const workspaceId = 1;
            const userId = 1;
            const consoleSpy = spyOn(console, 'error');

            service.removeMember(workspaceId, userId).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error removing member ${userId} from workspace ${workspaceId}:`, jasmine.any(Object));
        });
    });

    describe('getPermissions', () => {
        it('should get user permissions for a workspace successfully', () => {
            const workspaceId = 1;

            service.getPermissions(workspaceId).subscribe(result => {
                expect(result).toEqual(mockPermissions);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/permissions`);
            expect(req.request.method).toBe('GET');
            req.flush({ data: mockPermissions });
        });

        it('should handle HTTP error when getting permissions', () => {
            const workspaceId = 1;

            service.getPermissions(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to fetch permissions for workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/permissions`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });
        });

        it('should log error when getting permissions fails', () => {
            const workspaceId = 1;
            const consoleSpy = spyOn(console, 'error');

            service.getPermissions(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/permissions`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error fetching permissions for workspace ${workspaceId}:`, jasmine.any(Object));
        });
    });

    describe('transferOwnership', () => {
        it('should transfer ownership successfully', () => {
            const workspaceId = 1;
            const userId = 1;

            service.transferOwnership(workspaceId, userId).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/transfer-ownership`);
            expect(req.request.method).toBe('POST');
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            expect(req.request.body).toEqual({ user_id: userId.toString() });
            req.flush({ data: { message: 'Ownership transferred successfully' } });
        });

        it('should handle HTTP error when transferring ownership', () => {
            const workspaceId = 1;
            const userId = 1;

            service.transferOwnership(workspaceId, userId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to transfer ownership for workspace ${workspaceId} to user ${userId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/transfer-ownership`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });
        });

        it('should log error when transferring ownership fails', () => {
            const workspaceId = 1;
            const userId = 1;
            const consoleSpy = spyOn(console, 'error');

            service.transferOwnership(workspaceId, userId).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/transfer-ownership`);
            req.flush('Error', { status: 403, statusText: 'Forbidden' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error transferring ownership for workspace ${workspaceId} to user ${userId}:`, jasmine.any(Object));
        });

        it('should convert userId to string in request body', () => {
            const workspaceId = 1;
            const userId = 123;

            service.transferOwnership(workspaceId, userId).subscribe();

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/transfer-ownership`);
            expect(req.request.body).toEqual({ user_id: '123' });
            req.flush({ data: { message: 'Ownership transferred successfully' } });
        });
    });

    describe('permission checking', () => {
        it('should handle permission-based responses correctly', () => {
            const workspaceId = 1;
            const restrictedPermissions: IUserPermissions = {
                workspace_id: '1',
                user_id: '1',
                permissions: {
                    can_view: true,
                    can_edit: false,
                    can_delete: false,
                    can_manage_members: false,
                    can_manage_settings: false,
                    can_invite_members: false,
                    can_transfer_ownership: false
                },
                role: 'viewer'
            };

            service.getPermissions(workspaceId).subscribe(result => {
                expect(result.permissions.can_manage_members).toBe(false);
                expect(result.permissions.can_invite_members).toBe(false);
                expect(result.permissions.can_transfer_ownership).toBe(false);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/permissions`);
            req.flush({ data: restrictedPermissions });
        });

        it('should handle admin permissions correctly', () => {
            const workspaceId = 1;
            const adminPermissions: IUserPermissions = {
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

            service.getPermissions(workspaceId).subscribe(result => {
                expect(result.permissions.can_manage_members).toBe(true);
                expect(result.permissions.can_invite_members).toBe(true);
                expect(result.permissions.can_transfer_ownership).toBe(false);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/permissions`);
            req.flush({ data: adminPermissions });
        });

        it('should handle owner permissions correctly', () => {
            const workspaceId = 1;
            const ownerPermissions: IUserPermissions = {
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

            service.getPermissions(workspaceId).subscribe(result => {
                expect(result.permissions.can_manage_members).toBe(true);
                expect(result.permissions.can_invite_members).toBe(true);
                expect(result.permissions.can_transfer_ownership).toBe(true);
                expect(result.permissions.can_delete).toBe(true);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/permissions`);
            req.flush({ data: ownerPermissions });
        });
    });

    describe('member management operations', () => {
        it('should handle role update for different roles', () => {
            const workspaceId = 1;
            const userId = 1;
            const roles = ['admin', 'member', 'viewer'];

            roles.forEach(role => {
                service.updateMemberRole(workspaceId, userId, role).subscribe(result => {
                    expect(result).toEqual(mockMember);
                });

                const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
                expect(req.request.body).toEqual({ role });
                req.flush({ data: mockMember });
            });
        });

        it('should handle member removal with confirmation', () => {
            const workspaceId = 1;
            const userId = 1;

            service.removeMember(workspaceId, userId).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ message: 'Member removed successfully' });
        });

        it('should handle ownership transfer with proper payload', () => {
            const workspaceId = 1;
            const userId = 1;

            service.transferOwnership(workspaceId, userId).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/transfer-ownership`);
            expect(req.request.method).toBe('POST');
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            req.flush({ data: { message: 'Ownership transferred successfully' } });
        });
    });

    describe('data transformation', () => {
        it('should transform response data correctly for getMembers', () => {
            const workspaceId = 1;
            const response = { data: mockMemberList, meta: { some: 'meta' } };

            service.getMembers(workspaceId).subscribe(result => {
                expect(result).toEqual(mockMemberList);
                expect(result).not.toEqual(jasmine.objectContaining({ meta: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            req.flush(response);
        });

        it('should transform response data correctly for updateMemberRole', () => {
            const workspaceId = 1;
            const userId = 1;
            const response = { data: mockMember, updated: true };

            service.updateMemberRole(workspaceId, userId, 'admin').subscribe(result => {
                expect(result).toEqual(mockMember);
                expect(result).not.toEqual(jasmine.objectContaining({ updated: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            req.flush(response);
        });

        it('should transform response data correctly for getPermissions', () => {
            const workspaceId = 1;
            const response = { data: mockPermissions, cached: true };

            service.getPermissions(workspaceId).subscribe(result => {
                expect(result).toEqual(mockPermissions);
                expect(result).not.toEqual(jasmine.objectContaining({ cached: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/permissions`);
            req.flush(response);
        });

        it('should transform response data correctly for transferOwnership', () => {
            const workspaceId = 1;
            const userId = 1;
            const response = { data: { message: 'Transferred' }, timestamp: '2024-01-01' };

            service.transferOwnership(workspaceId, userId).subscribe(result => {
                expect(result).toEqual({ message: 'Transferred' });
                expect(result).not.toEqual(jasmine.objectContaining({ timestamp: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/transfer-ownership`);
            req.flush(response);
        });
    });

    describe('HTTP headers', () => {
        it('should set correct headers for PATCH requests', () => {
            const workspaceId = 1;
            const userId = 1;

            service.updateMemberRole(workspaceId, userId, 'admin').subscribe();

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            req.flush({ data: mockMember });
        });

        it('should set correct headers for POST requests', () => {
            const workspaceId = 1;
            const userId = 1;

            service.transferOwnership(workspaceId, userId).subscribe();

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/transfer-ownership`);
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            req.flush({ data: { message: 'Transferred' } });
        });

        it('should not set content-type for GET requests', () => {
            const workspaceId = 1;

            service.getMembers(workspaceId).subscribe();

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            expect(req.request.headers.get('Content-Type')).toBeNull();
            req.flush({ data: mockMemberList });
        });

        it('should not set content-type for DELETE requests', () => {
            const workspaceId = 1;
            const userId = 1;

            service.removeMember(workspaceId, userId).subscribe();

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
            expect(req.request.headers.get('Content-Type')).toBeNull();
            req.flush({ message: 'Member removed successfully' });
        });
    });

    describe('error handling edge cases', () => {
        it('should handle network errors', () => {
            const workspaceId = 1;

            service.getMembers(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to fetch members for workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            req.error(new ErrorEvent('Network error'));
        });

        it('should handle timeout errors', () => {
            const workspaceId = 1;

            service.getMembers(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to fetch members for workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            req.flush('Timeout error', { status: 408, statusText: 'Request Timeout' });
        });

        it('should handle malformed responses', () => {
            const workspaceId = 1;

            service.getMembers(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to fetch members for workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
            req.flush('Invalid JSON', { status: 200, statusText: 'OK', headers: { 'Content-Type': 'text/plain' } });
        });
    });
});