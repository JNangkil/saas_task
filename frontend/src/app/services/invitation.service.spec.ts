import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { InvitationService } from './invitation.service';
import {
    IInvitation,
    ICreateInvitationRequest,
    IInvitationDetails,
    IAcceptInvitationRequest,
    IInvitationListResponse
} from '../interfaces/invitation.interface';

describe('InvitationService', () => {
    let service: InvitationService;
    let httpMock: HttpTestingController;
    let httpClient: HttpClient;

    const mockInvitation: IInvitation = {
        id: '1',
        workspace_id: '1',
        email: 'test@example.com',
        role: 'member',
        token: 'test-token',
        status: 'pending',
        invited_by: '1',
        invited_by_user: {
            id: '1',
            name: 'Test User',
            email: 'inviter@example.com'
        },
        expires_at: '2024-12-31T23:59:59Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
    };

    const mockInvitationDetails: IInvitationDetails = {
        invitation: mockInvitation,
        workspace: {
            id: '1',
            name: 'Test Workspace',
            description: 'A test workspace'
        },
        invited_by_user: {
            id: '1',
            name: 'Test User',
            email: 'inviter@example.com'
        }
    };

    const mockInvitationList: IInvitationListResponse = {
        invitations: [mockInvitation],
        total: 1,
        page: 1,
        per_page: 15
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [InvitationService]
        });

        service = TestBed.inject(InvitationService);
        httpMock = TestBed.inject(HttpTestingController);
        httpClient = TestBed.inject(HttpClient);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('createInvitation', () => {
        it('should create an invitation successfully', () => {
            const workspaceId = 1;
            const invitationData: ICreateInvitationRequest = {
                email: 'test@example.com',
                role: 'member',
                message: 'Please join our workspace'
            };

            service.createInvitation(workspaceId, invitationData).subscribe(result => {
                expect(result).toEqual(mockInvitation);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            expect(req.request.method).toBe('POST');
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            expect(req.request.body).toEqual(invitationData);
            req.flush({ data: mockInvitation });
        });

        it('should handle HTTP error when creating invitation', () => {
            const workspaceId = 1;
            const invitationData: ICreateInvitationRequest = {
                email: 'test@example.com',
                role: 'member'
            };

            service.createInvitation(workspaceId, invitationData).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe('Failed to create invitation');
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            req.flush('Error', { status: 400, statusText: 'Bad Request' });
        });

        it('should log error when creating invitation fails', () => {
            const workspaceId = 1;
            const invitationData: ICreateInvitationRequest = {
                email: 'test@example.com',
                role: 'member'
            };
            const consoleSpy = spyOn(console, 'error');

            service.createInvitation(workspaceId, invitationData).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            req.flush('Error', { status: 400, statusText: 'Bad Request' });

            expect(consoleSpy).toHaveBeenCalledWith('Error creating invitation:', jasmine.any(Object));
        });
    });

    describe('getInvitations', () => {
        it('should get invitations for a workspace successfully', () => {
            const workspaceId = 1;

            service.getInvitations(workspaceId).subscribe(result => {
                expect(result).toEqual(mockInvitationList);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            expect(req.request.method).toBe('GET');
            req.flush({ data: mockInvitationList });
        });

        it('should handle HTTP error when getting invitations', () => {
            const workspaceId = 1;

            service.getInvitations(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to fetch invitations for workspace ${workspaceId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });
        });

        it('should log error when getting invitations fails', () => {
            const workspaceId = 1;
            const consoleSpy = spyOn(console, 'error');

            service.getInvitations(workspaceId).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error fetching invitations for workspace ${workspaceId}:`, jasmine.any(Object));
        });
    });

    describe('cancelInvitation', () => {
        it('should cancel an invitation successfully', () => {
            const workspaceId = 1;
            const invitationId = 1;

            service.cancelInvitation(workspaceId, invitationId).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations/${invitationId}`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ message: 'Invitation cancelled successfully' });
        });

        it('should handle HTTP error when cancelling invitation', () => {
            const workspaceId = 1;
            const invitationId = 1;

            service.cancelInvitation(workspaceId, invitationId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to cancel invitation ${invitationId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations/${invitationId}`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });
        });

        it('should log error when cancelling invitation fails', () => {
            const workspaceId = 1;
            const invitationId = 1;
            const consoleSpy = spyOn(console, 'error');

            service.cancelInvitation(workspaceId, invitationId).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations/${invitationId}`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error cancelling invitation ${invitationId}:`, jasmine.any(Object));
        });
    });

    describe('resendInvitation', () => {
        it('should resend an invitation successfully', () => {
            const workspaceId = 1;
            const invitationId = 1;

            service.resendInvitation(workspaceId, invitationId).subscribe(result => {
                expect(result).toEqual(mockInvitation);
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush({ data: mockInvitation });
        });

        it('should handle HTTP error when resending invitation', () => {
            const workspaceId = 1;
            const invitationId = 1;

            service.resendInvitation(workspaceId, invitationId).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to resend invitation ${invitationId}`);
                }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`);
            req.flush('Error', { status: 400, statusText: 'Bad Request' });
        });

        it('should log error when resending invitation fails', () => {
            const workspaceId = 1;
            const invitationId = 1;
            const consoleSpy = spyOn(console, 'error');

            service.resendInvitation(workspaceId, invitationId).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`);
            req.flush('Error', { status: 400, statusText: 'Bad Request' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error resending invitation ${invitationId}:`, jasmine.any(Object));
        });
    });

    describe('getInvitationByToken', () => {
        it('should get invitation by token successfully', () => {
            const token = 'test-token';

            service.getInvitationByToken(token).subscribe(result => {
                expect(result).toEqual(mockInvitationDetails);
            });

            const req = httpMock.expectOne(`/api/invitations/${token}`);
            expect(req.request.method).toBe('GET');
            req.flush({ data: mockInvitationDetails });
        });

        it('should handle HTTP error when getting invitation by token', () => {
            const token = 'invalid-token';

            service.getInvitationByToken(token).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to fetch invitation details for token ${token}`);
                }
            });

            const req = httpMock.expectOne(`/api/invitations/${token}`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });
        });

        it('should log error when getting invitation by token fails', () => {
            const token = 'invalid-token';
            const consoleSpy = spyOn(console, 'error');

            service.getInvitationByToken(token).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/invitations/${token}`);
            req.flush('Error', { status: 404, statusText: 'Not Found' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error fetching invitation details for token ${token}:`, jasmine.any(Object));
        });
    });

    describe('acceptInvitation', () => {
        it('should accept an invitation without registration data', () => {
            const token = 'test-token';

            service.acceptInvitation(token).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/accept`);
            expect(req.request.method).toBe('POST');
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            expect(req.request.body).toEqual({});
            req.flush({ data: { message: 'Invitation accepted successfully' } });
        });

        it('should accept an invitation with registration data', () => {
            const token = 'test-token';
            const acceptData: IAcceptInvitationRequest = {
                name: 'New User'
            };

            service.acceptInvitation(token, acceptData).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/accept`);
            expect(req.request.method).toBe('POST');
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            expect(req.request.body).toEqual(acceptData);
            req.flush({ data: { message: 'Registration successful and invitation accepted' } });
        });

        it('should handle HTTP error when accepting invitation', () => {
            const token = 'invalid-token';

            service.acceptInvitation(token).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to accept invitation with token ${token}`);
                }
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/accept`);
            req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
        });

        it('should log error when accepting invitation fails', () => {
            const token = 'invalid-token';
            const consoleSpy = spyOn(console, 'error');

            service.acceptInvitation(token).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/accept`);
            req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error accepting invitation with token ${token}:`, jasmine.any(Object));
        });
    });

    describe('declineInvitation', () => {
        it('should decline an invitation successfully', () => {
            const token = 'test-token';

            service.declineInvitation(token).subscribe(result => {
                expect(result).toBeTruthy();
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/decline`);
            expect(req.request.method).toBe('POST');
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            expect(req.request.body).toEqual({});
            req.flush({ message: 'Invitation declined successfully' });
        });

        it('should handle HTTP error when declining invitation', () => {
            const token = 'invalid-token';

            service.declineInvitation(token).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error.message).toBe(`Failed to decline invitation with token ${token}`);
                }
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/decline`);
            req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });
        });

        it('should log error when declining invitation fails', () => {
            const token = 'invalid-token';
            const consoleSpy = spyOn(console, 'error');

            service.declineInvitation(token).subscribe({
                next: () => fail('Should have failed'),
                error: () => { }
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/decline`);
            req.flush('Error', { status: 422, statusText: 'Unprocessable Entity' });

            expect(consoleSpy).toHaveBeenCalledWith(`Error declining invitation with token ${token}:`, jasmine.any(Object));
        });
    });

    describe('data transformation', () => {
        it('should transform response data correctly for createInvitation', () => {
            const workspaceId = 1;
            const invitationData: ICreateInvitationRequest = {
                email: 'test@example.com',
                role: 'member'
            };
            const response = { data: mockInvitation, meta: { some: 'meta' } };

            service.createInvitation(workspaceId, invitationData).subscribe(result => {
                expect(result).toEqual(mockInvitation);
                expect(result).not.toEqual(jasmine.objectContaining({ meta: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            req.flush(response);
        });

        it('should transform response data correctly for getInvitations', () => {
            const workspaceId = 1;
            const response = { data: mockInvitationList, links: { self: 'url' } };

            service.getInvitations(workspaceId).subscribe(result => {
                expect(result).toEqual(mockInvitationList);
                expect(result).not.toEqual(jasmine.objectContaining({ links: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            req.flush(response);
        });

        it('should transform response data correctly for getInvitationByToken', () => {
            const token = 'test-token';
            const response = { data: mockInvitationDetails, status: 'success' };

            service.getInvitationByToken(token).subscribe(result => {
                expect(result).toEqual(mockInvitationDetails);
                expect(result).not.toEqual(jasmine.objectContaining({ status: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/invitations/${token}`);
            req.flush(response);
        });

        it('should transform response data correctly for acceptInvitation', () => {
            const token = 'test-token';
            const response = { data: { message: 'Accepted' }, timestamp: '2024-01-01' };

            service.acceptInvitation(token).subscribe(result => {
                expect(result).toEqual({ message: 'Accepted' });
                expect(result).not.toEqual(jasmine.objectContaining({ timestamp: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/invitations/${token}/accept`);
            req.flush(response);
        });

        it('should transform response data correctly for resendInvitation', () => {
            const workspaceId = 1;
            const invitationId = 1;
            const response = { data: mockInvitation, sent: true };

            service.resendInvitation(workspaceId, invitationId).subscribe(result => {
                expect(result).toEqual(mockInvitation);
                expect(result).not.toEqual(jasmine.objectContaining({ sent: jasmine.anything() }));
            });

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`);
            req.flush(response);
        });
    });

    describe('HTTP headers', () => {
        it('should set correct headers for POST requests', () => {
            const workspaceId = 1;
            const invitationData: ICreateInvitationRequest = {
                email: 'test@example.com',
                role: 'member'
            };

            service.createInvitation(workspaceId, invitationData).subscribe();

            const req = httpMock.expectOne(`/api/workspaces/${workspaceId}/invitations`);
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            req.flush({ data: mockInvitation });
        });

        it('should set correct headers for acceptInvitation', () => {
            const token = 'test-token';
            const acceptData: IAcceptInvitationRequest = { name: 'Test User' };

            service.acceptInvitation(token, acceptData).subscribe();

            const req = httpMock.expectOne(`/api/invitations/${token}/accept`);
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            req.flush({ data: { message: 'Accepted' } });
        });

        it('should set correct headers for declineInvitation', () => {
            const token = 'test-token';

            service.declineInvitation(token).subscribe();

            const req = httpMock.expectOne(`/api/invitations/${token}/decline`);
            expect(req.request.headers.get('Content-Type')).toBe('application/json');
            req.flush({ message: 'Declined' });
        });
    });
});