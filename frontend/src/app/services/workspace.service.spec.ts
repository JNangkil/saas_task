import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { WorkspaceService } from './workspace.service';
import { IWorkspace, IWorkspaceCreateRequest, IWorkspaceUpdateRequest, IWorkspaceMember } from '../interfaces/workspace.interface';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let httpMock: HttpTestingController;

  const mockWorkspace: IWorkspace = {
    id: '1',
    tenant_id: 'tenant-1',
    name: 'Test Workspace',
    description: 'Test workspace description',
    color: '#6366f1',
    icon: '🏢',
    is_archived: false,
    is_default: true,
    is_active: true,
    settings: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null
  };

  const mockMember: IWorkspaceMember = {
    user_id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    role: 'admin',
    joined_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [WorkspaceService]
    });

    service = TestBed.inject(WorkspaceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getWorkspaces', () => {
    it('should return workspaces for a tenant', () => {
      const tenantId = 'tenant-1';
      const mockResponse = { data: [mockWorkspace] };

      service.getWorkspaces(tenantId).subscribe(workspaces => {
        expect(workspaces).toEqual([mockWorkspace]);
      });

      const req = httpMock.expectOne(`/api/tenants/${tenantId}/workspaces`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include archived workspaces when requested', () => {
      const tenantId = 'tenant-1';
      const mockResponse = { data: [mockWorkspace] };

      service.getWorkspaces(tenantId, true).subscribe(workspaces => {
        expect(workspaces).toEqual([mockWorkspace]);
      });

      const req = httpMock.expectOne(`/api/tenants/${tenantId}/workspaces?include_archived=true`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return empty array if response has no data', () => {
      const tenantId = 'tenant-1';
      const mockResponse = {};

      service.getWorkspaces(tenantId).subscribe(workspaces => {
        expect(workspaces).toEqual([]);
      });

      const req = httpMock.expectOne(`/api/tenants/${tenantId}/workspaces`);
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const tenantId = 'tenant-1';

      service.getWorkspaces(tenantId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch workspaces');
        }
      });

      const req = httpMock.expectOne(`/api/tenants/${tenantId}/workspaces`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getCurrentTenantWorkspaces', () => {
    it('should return workspaces for current tenant', () => {
      const mockResponse = { data: [mockWorkspace] };

      service.getCurrentTenantWorkspaces().subscribe(workspaces => {
        expect(workspaces).toEqual([mockWorkspace]);
      });

      const req = httpMock.expectOne('/api/workspaces');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should include archived workspaces when requested', () => {
      const mockResponse = { data: [mockWorkspace] };

      service.getCurrentTenantWorkspaces(true).subscribe(workspaces => {
        expect(workspaces).toEqual([mockWorkspace]);
      });

      const req = httpMock.expectOne('/api/workspaces?include_archived=true');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      service.getCurrentTenantWorkspaces().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch current tenant workspaces');
        }
      });

      const req = httpMock.expectOne('/api/workspaces');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getWorkspace', () => {
    it('should return a single workspace', () => {
      const workspaceId = '1';
      const mockResponse = { data: mockWorkspace };

      service.getWorkspace(workspaceId).subscribe(workspace => {
        expect(workspace).toEqual(mockWorkspace);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';

      service.getWorkspace(workspaceId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}`);
      req.flush('Error', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createWorkspace', () => {
    it('should create a new workspace', () => {
      const tenantId = 'tenant-1';
      const workspaceData: IWorkspaceCreateRequest = {
        name: 'New Workspace',
        description: 'New workspace description',
        color: '#8b5cf6',
        icon: '🚀'
      };
      const mockResponse = { data: mockWorkspace };

      service.createWorkspace(tenantId, workspaceData).subscribe(workspace => {
        expect(workspace).toEqual(mockWorkspace);
      });

      const req = httpMock.expectOne(`/api/tenants/${tenantId}/workspaces`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(workspaceData);
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const tenantId = 'tenant-1';
      const workspaceData: IWorkspaceCreateRequest = {
        name: 'New Workspace'
      };

      service.createWorkspace(tenantId, workspaceData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to create workspace');
        }
      });

      const req = httpMock.expectOne(`/api/tenants/${tenantId}/workspaces`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('updateWorkspace', () => {
    it('should update an existing workspace', () => {
      const workspaceId = '1';
      const updateData: IWorkspaceUpdateRequest = {
        name: 'Updated Workspace',
        description: 'Updated description'
      };
      const mockResponse = { data: mockWorkspace };

      service.updateWorkspace(workspaceId, updateData).subscribe(workspace => {
        expect(workspace).toEqual(mockWorkspace);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';
      const updateData: IWorkspaceUpdateRequest = {
        name: 'Updated Workspace'
      };

      service.updateWorkspace(workspaceId, updateData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to update workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('archiveWorkspace', () => {
    it('should archive a workspace', () => {
      const workspaceId = '1';
      const mockResponse = { success: true };

      service.archiveWorkspace(workspaceId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/archive`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';

      service.archiveWorkspace(workspaceId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to archive workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/archive`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('restoreWorkspace', () => {
    it('should restore a workspace', () => {
      const workspaceId = '1';
      const mockResponse = { success: true };

      service.restoreWorkspace(workspaceId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/restore`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';

      service.restoreWorkspace(workspaceId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to restore workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/restore`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete a workspace', () => {
      const workspaceId = '1';
      const mockResponse = { success: true };

      service.deleteWorkspace(workspaceId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';

      service.deleteWorkspace(workspaceId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to delete workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('getWorkspaceMembers', () => {
    it('should return workspace members', () => {
      const workspaceId = '1';
      const mockResponse = { data: [mockMember] };

      service.getWorkspaceMembers(workspaceId).subscribe(members => {
        expect(members).toEqual([mockMember]);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return empty array if response has no data', () => {
      const workspaceId = '1';
      const mockResponse = {};

      service.getWorkspaceMembers(workspaceId).subscribe(members => {
        expect(members).toEqual([]);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';

      service.getWorkspaceMembers(workspaceId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch workspace members for 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('addWorkspaceMember', () => {
    it('should add a member to workspace', () => {
      const workspaceId = '1';
      const memberData = {
        email: 'newmember@example.com',
        role: 'member'
      };
      const mockResponse = { data: { success: true } };

      service.addWorkspaceMember(workspaceId, memberData).subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(memberData);
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';
      const memberData = {
        email: 'newmember@example.com',
        role: 'member'
      };

      service.addWorkspaceMember(workspaceId, memberData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to add member to workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('updateWorkspaceMemberRole', () => {
    it('should update member role', () => {
      const workspaceId = '1';
      const userId = 'user-1';
      const newRole = 'admin';
      const mockResponse = { data: { success: true } };

      service.updateWorkspaceMemberRole(workspaceId, userId, newRole).subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ role: newRole });
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';
      const userId = 'user-1';
      const newRole = 'admin';

      service.updateWorkspaceMemberRole(workspaceId, userId, newRole).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to update member role in workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('removeWorkspaceMember', () => {
    it('should remove member from workspace', () => {
      const workspaceId = '1';
      const userId = 'user-1';
      const mockResponse = { success: true };

      service.removeWorkspaceMember(workspaceId, userId).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';
      const userId = 'user-1';

      service.removeWorkspaceMember(workspaceId, userId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to remove member from workspace 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/members/${userId}`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('getWorkspaceSettings', () => {
    it('should return workspace settings', () => {
      const workspaceId = '1';
      const mockSettings = {
        theme: 'dark',
        notifications: true,
        default_board_view: 'kanban'
      };
      const mockResponse = { data: mockSettings };

      service.getWorkspaceSettings(workspaceId).subscribe(settings => {
        expect(settings).toEqual(mockSettings);
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/settings`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';

      service.getWorkspaceSettings(workspaceId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch workspace settings for 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/settings`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('updateWorkspaceSettings', () => {
    it('should update workspace settings', () => {
      const workspaceId = '1';
      const newSettings = {
        theme: 'light',
        notifications: false,
        default_board_view: 'list'
      };
      const mockResponse = { data: { success: true } };

      service.updateWorkspaceSettings(workspaceId, newSettings).subscribe(response => {
        expect(response).toEqual({ success: true });
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/settings`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(newSettings);
      req.flush(mockResponse);
    });

    it('should handle errors', () => {
      const workspaceId = '1';
      const newSettings = {
        theme: 'light',
        notifications: false
      };

      service.updateWorkspaceSettings(workspaceId, newSettings).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to update workspace settings for 1');
        }
      });

      const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/settings`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });
});