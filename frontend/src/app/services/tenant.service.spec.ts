import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TenantService } from './tenant.service';
import { ITenant } from '../interfaces/workspace.interface';

describe('TenantService', () => {
  let service: TenantService;
  let httpMock: HttpTestingController;
  const mockApiUrl = '/api/tenants';

  const mockTenant: ITenant = {
    id: '1',
    name: 'Test Tenant',
    slug: 'test-tenant',
    logo_url: 'https://example.com/logo.png',
    billing_email: 'billing@test.com',
    settings: {},
    status: 'active',
    locale: 'en',
    timezone: 'UTC',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TenantService]
    });

    service = TestBed.inject(TenantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTenants', () => {
    it('should return an array of tenants', () => {
      const mockTenants: ITenant[] = [mockTenant];

      service.getTenants().subscribe(tenants => {
        expect(tenants).toEqual(mockTenants);
      });

      const req = httpMock.expectOne(mockApiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockTenants);
    });

    it('should return empty array if response is null', () => {
      service.getTenants().subscribe(tenants => {
        expect(tenants).toEqual([]);
      });

      const req = httpMock.expectOne(mockApiUrl);
      req.flush(null);
    });

    it('should handle errors', () => {
      service.getTenants().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch tenants');
        }
      });

      const req = httpMock.expectOne(mockApiUrl);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getTenant', () => {
    it('should return a single tenant', () => {
      service.getTenant('1').subscribe(tenant => {
        expect(tenant).toEqual(mockTenant);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTenant);
    });

    it('should handle errors', () => {
      service.getTenant('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      req.flush('Error', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createTenant', () => {
    it('should create a new tenant', () => {
      const newTenantData = {
        name: 'New Tenant',
        slug: 'new-tenant',
        billing_email: 'new@example.com'
      };

      service.createTenant(newTenantData).subscribe(tenant => {
        expect(tenant).toEqual(mockTenant);
      });

      const req = httpMock.expectOne(mockApiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newTenantData);
      req.flush(mockTenant);
    });

    it('should handle errors', () => {
      const newTenantData = {
        name: 'New Tenant',
        slug: 'new-tenant',
        billing_email: 'new@example.com'
      };

      service.createTenant(newTenantData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to create tenant');
        }
      });

      const req = httpMock.expectOne(mockApiUrl);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('updateTenant', () => {
    it('should update an existing tenant', () => {
      const updateData = {
        name: 'Updated Tenant',
        billing_email: 'updated@example.com'
      };

      service.updateTenant('1', updateData).subscribe(tenant => {
        expect(tenant).toEqual(mockTenant);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockTenant);
    });

    it('should handle errors', () => {
      const updateData = {
        name: 'Updated Tenant',
        billing_email: 'updated@example.com'
      };

      service.updateTenant('1', updateData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to update tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('archiveTenant', () => {
    it('should archive a tenant', () => {
      service.archiveTenant('1').subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/archive`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('should handle errors', () => {
      service.archiveTenant('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to archive tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/archive`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('reactivateTenant', () => {
    it('should reactivate a tenant', () => {
      service.reactivateTenant('1').subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/reactivate`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('should handle errors', () => {
      service.reactivateTenant('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to reactivate tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/reactivate`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('deleteTenant', () => {
    it('should delete a tenant', () => {
      service.deleteTenant('1').subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });

    it('should handle errors', () => {
      service.deleteTenant('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to delete tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('getTenantMembers', () => {
    it('should return tenant members', () => {
      const mockMembers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'owner' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
      ];

      service.getTenantMembers('1').subscribe(members => {
        expect(members).toEqual(mockMembers);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMembers);
    });

    it('should return empty array if response is null', () => {
      service.getTenantMembers('1').subscribe(members => {
        expect(members).toEqual([]);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members`);
      req.flush(null);
    });

    it('should handle errors', () => {
      service.getTenantMembers('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch tenant members for 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('addTenantMember', () => {
    it('should add a member to tenant', () => {
      const memberData = {
        email: 'newmember@example.com',
        role: 'member'
      };

      service.addTenantMember('1', memberData).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(memberData);
      req.flush({ success: true });
    });

    it('should handle errors', () => {
      const memberData = {
        email: 'newmember@example.com',
        role: 'member'
      };

      service.addTenantMember('1', memberData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to add member to tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('updateTenantMemberRole', () => {
    it('should update member role', () => {
      service.updateTenantMemberRole('1', '2', 'admin').subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members/2`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ role: 'admin' });
      req.flush({ success: true });
    });

    it('should handle errors', () => {
      service.updateTenantMemberRole('1', '2', 'admin').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to update member role in tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members/2`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('removeTenantMember', () => {
    it('should remove member from tenant', () => {
      service.removeTenantMember('1', '2').subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });

    it('should handle errors', () => {
      service.removeTenantMember('1', '2').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to remove member from tenant 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/members/2`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });

  describe('getTenantSettings', () => {
    it('should return tenant settings', () => {
      const mockSettings = {
        theme: 'dark',
        notifications: true,
        locale: 'en'
      };

      service.getTenantSettings('1').subscribe(settings => {
        expect(settings).toEqual(mockSettings);
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/settings`);
      expect(req.request.method).toBe('GET');
      req.flush(mockSettings);
    });

    it('should handle errors', () => {
      service.getTenantSettings('1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to fetch tenant settings for 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/settings`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('updateTenantSettings', () => {
    it('should update tenant settings', () => {
      const newSettings = {
        theme: 'light',
        notifications: false,
        locale: 'fr'
      };

      service.updateTenantSettings('1', newSettings).subscribe(response => {
        expect(response).toBeTruthy();
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/settings`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ settings: newSettings });
      req.flush({ success: true });
    });

    it('should handle errors', () => {
      const newSettings = {
        theme: 'light',
        notifications: false,
        locale: 'fr'
      };

      service.updateTenantSettings('1', newSettings).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toBe('Failed to update tenant settings for 1');
        }
      });

      const req = httpMock.expectOne(`${mockApiUrl}/1/settings`);
      req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
    });
  });
});