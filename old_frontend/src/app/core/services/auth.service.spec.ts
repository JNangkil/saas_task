import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, LoginRequest, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest, VerifyTokenRequest } from './auth.service';
import { ApiService } from '../../services/api.service';
import { MfaSetupRequest, MfaSetupResponse, MfaEnableRequest, MfaEnableResponse, MfaDisableRequest, MfaDisableResponse, MfaVerifyRequest, MfaVerifyResponse, MfaStatus, MfaLoginRequest, MfaLoginResponse } from '../models/mfa.models';
import { AccountLockoutResponse, InvalidCredentialsResponse, LockoutState, LockoutInfo } from '../models/account-lockout.models';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let routerSpy: jasmine.SpyObj<Router>;

    const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
    };

    const mockLoginResponse: LoginResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: mockUser
    };

    const mockMfaLoginResponse: MfaLoginResponse = {
        requires_mfa: true,
        mfa_token: 'mock-mfa-token',
        message: 'MFA required'
    };

    const mockMfaVerifyResponse: MfaVerifyResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: mockUser
    };

    const mockMfaSetupResponse: MfaSetupResponse = {
        secret: 'mock-secret',
        qr_code_url: 'mock-qr-url',
        recovery_codes: ['code1', 'code2', 'code3']
    };

    const mockMfaEnableResponse: MfaEnableResponse = {
        message: 'MFA enabled successfully'
    };

    const mockMfaDisableResponse: MfaDisableResponse = {
        message: 'MFA disabled successfully'
    };

    const mockMfaStatus: MfaStatus = {
        enabled: true,
        setup_completed: true
    };

    beforeEach(() => {
        const spy = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                AuthService,
                ApiService,
                { provide: Router, useValue: spy }
            ]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;

        // Clear localStorage before each test
        localStorage.clear();
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    describe('Authentication State', () => {
        it('should initialize with empty authentication state', () => {
            expect(service.isAuthenticated()).toBe(false);
            expect(service.getCurrentUser()).toBeNull();
            expect(service.getToken()).toBeNull();
        });

        it('should initialize authentication state from localStorage', () => {
            localStorage.setItem('auth_token', 'stored-token');
            localStorage.setItem('auth_user', JSON.stringify(mockUser));

            service = TestBed.inject(AuthService);

            expect(service.isAuthenticated()).toBe(true);
            expect(service.getCurrentUser()).toEqual(mockUser);
            expect(service.getToken()).toBe('stored-token');
        });

        it('should clear authentication state on logout', () => {
            // First set up authenticated state
            localStorage.setItem('auth_token', 'stored-token');
            localStorage.setItem('auth_user', JSON.stringify(mockUser));
            service = TestBed.inject(AuthService);

            expect(service.isAuthenticated()).toBe(true);

            // Now logout
            service.logout().subscribe();

            expect(service.isAuthenticated()).toBe(false);
            expect(service.getCurrentUser()).toBeNull();
            expect(service.getToken()).toBeNull();
            expect(localStorage.getItem('auth_token')).toBeNull();
            expect(localStorage.getItem('auth_user')).toBeNull();
        });
    });

    describe('Login Method', () => {
        it('should login successfully with valid credentials', () => {
            const loginRequest: LoginRequest = {
                email: 'test@example.com',
                password: 'password'
            };

            service.login(loginRequest).subscribe(response => {
                expect(response).toEqual(mockLoginResponse);
                expect(service.isAuthenticated()).toBe(true);
                expect(service.getCurrentUser()).toEqual(mockUser);
                expect(service.getToken()).toBe(mockLoginResponse.access_token);
            });

            const req = httpMock.expectOne('auth/login');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(loginRequest);
            req.flush(mockLoginResponse);
        });

        it('should handle login error', () => {
            const loginRequest: LoginRequest = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            service.login(loginRequest).subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error).toBeDefined();
                    expect(service.isAuthenticated()).toBe(false);
                }
            });

            const req = httpMock.expectOne('auth/login');
            req.flush('Invalid credentials', { status: 401, statusText: 'Unauthorized' });
        });
    });

    describe('MFA Login Methods', () => {
        it('should handle MFA login', () => {
            const mfaLoginRequest: MfaLoginRequest = {
                email: 'test@example.com',
                password: 'password'
            };

            service.loginWithMfa(mfaLoginRequest).subscribe(response => {
                expect(response).toEqual(mockMfaLoginResponse);
                expect(service.isMfaRequired()).toBe(true);
                expect(service.getMfaState().requiresMfa).toBe(true);
                expect(service.getMfaState().mfaToken).toBe(mockMfaLoginResponse.mfa_token);
                expect(service.getMfaState().email).toBe(mfaLoginRequest.email);
            });

            const req = httpMock.expectOne('auth/login/mfa');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(mfaLoginRequest);
            req.flush(mockMfaLoginResponse);
        });

        it('should verify MFA code', () => {
            // First set up MFA state
            localStorage.setItem('mfa_token', 'mock-mfa-token');
            localStorage.setItem('mfa_email', 'test@example.com');
            service = TestBed.inject(AuthService);

            const mfaVerifyRequest: MfaVerifyRequest = {
                email: 'test@example.com',
                password: 'password',
                code: '123456'
            };

            service.verifyMfaCode(mfaVerifyRequest).subscribe(response => {
                expect(response).toEqual(mockMfaVerifyResponse);
                expect(service.isAuthenticated()).toBe(true);
                expect(service.getCurrentUser()).toEqual(mockUser);
                expect(service.isMfaRequired()).toBe(false);
            });

            const req = httpMock.expectOne('auth/mfa/verify');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({
                ...mfaVerifyRequest,
                email: 'test@example.com',
                mfa_token: 'mock-mfa-token'
            });
            req.flush(mockMfaVerifyResponse);
        });
    });

    describe('Password Reset Methods', () => {
        it('should request password reset', () => {
            const forgotPasswordRequest: ForgotPasswordRequest = {
                email: 'test@example.com'
            };

            service.forgotPassword(forgotPasswordRequest).subscribe(response => {
                expect(response).toEqual({ message: 'Password reset link sent' });
            });

            const req = httpMock.expectOne('auth/password/forgot');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(forgotPasswordRequest);
            req.flush({ message: 'Password reset link sent' });
        });

        it('should reset password', () => {
            const resetPasswordRequest: ResetPasswordRequest = {
                email: 'test@example.com',
                token: 'reset-token',
                password: 'newpassword',
                password_confirmation: 'newpassword'
            };

            service.resetPassword(resetPasswordRequest).subscribe(response => {
                expect(response).toEqual({ message: 'Password reset successful' });
            });

            const req = httpMock.expectOne('auth/password/reset');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(resetPasswordRequest);
            req.flush({ message: 'Password reset successful' });
        });

        it('should verify reset token', () => {
            const verifyTokenRequest: VerifyTokenRequest = {
                email: 'test@example.com',
                token: 'reset-token'
            };

            service.verifyResetToken(verifyTokenRequest).subscribe(response => {
                expect(response).toEqual({ valid: true, message: 'Token is valid' });
            });

            const req = httpMock.expectOne('auth/password/verify');
            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('email')).toBe('test@example.com');
            expect(req.request.params.get('token')).toBe('reset-token');
            req.flush({ valid: true, message: 'Token is valid' });
        });
    });

    describe('MFA Setup and Management', () => {
        it('should setup MFA', () => {
            const mfaSetupRequest: MfaSetupRequest = {
                password: 'password'
            };

            service.setupMfa(mfaSetupRequest).subscribe(response => {
                expect(response).toEqual(mockMfaSetupResponse);
            });

            const req = httpMock.expectOne('auth/mfa/setup');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(mfaSetupRequest);
            req.flush(mockMfaSetupResponse);
        });

        it('should enable MFA', () => {
            const mfaEnableRequest: MfaEnableRequest = {
                code: '123456'
            };

            service.enableMfa(mfaEnableRequest).subscribe(response => {
                expect(response).toEqual(mockMfaEnableResponse);
            });

            const req = httpMock.expectOne('auth/mfa/enable');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(mfaEnableRequest);
            req.flush(mockMfaEnableResponse);
        });

        it('should disable MFA', () => {
            const mfaDisableRequest: MfaDisableRequest = {
                password: 'password'
            };

            service.disableMfa(mfaDisableRequest).subscribe(response => {
                expect(response).toEqual(mockMfaDisableResponse);
            });

            const req = httpMock.expectOne('auth/mfa/disable');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(mfaDisableRequest);
            req.flush(mockMfaDisableResponse);
        });

        it('should get MFA status', () => {
            service.getMfaStatus().subscribe(response => {
                expect(response).toEqual(mockMfaStatus);
            });

            const req = httpMock.expectOne('auth/mfa/status');
            expect(req.request.method).toBe('GET');
            req.flush(mockMfaStatus);
        });
    });

    describe('Token Management', () => {
        it('should refresh token', () => {
            localStorage.setItem('refresh_token', 'mock-refresh-token');
            service = TestBed.inject(AuthService);

            service.refreshToken().subscribe(response => {
                expect(response).toEqual(mockLoginResponse);
                expect(service.getToken()).toBe(mockLoginResponse.access_token);
            });

            const req = httpMock.expectOne('refresh');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ refresh_token: 'mock-refresh-token' });
            req.flush(mockLoginResponse);
        });

        it('should handle refresh token failure', () => {
            localStorage.setItem('refresh_token', 'expired-refresh-token');
            service = TestBed.inject(AuthService);

            service.refreshToken().subscribe({
                next: () => fail('Should have failed'),
                error: (error) => {
                    expect(error).toBeDefined();
                    expect(service.isAuthenticated()).toBe(false);
                    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
                }
            });

            const req = httpMock.expectOne('refresh');
            req.flush('Invalid refresh token', { status: 401, statusText: 'Unauthorized' });
        });

        it('should get auth header', () => {
            // Test when not authenticated
            expect(service.getAuthHeader()).toEqual({});

            // Test when authenticated
            localStorage.setItem('auth_token', 'test-token');
            service = TestBed.inject(AuthService);

            expect(service.getAuthHeader()).toEqual({ Authorization: 'Bearer test-token' });
        });
    });

    describe('Account Lockout Handling', () => {
        it('should handle account lockout error', () => {
            const lockoutResponse: AccountLockoutResponse = {
                error: 'Account locked',
                message: 'Account is locked',
                locked_until: '2023-01-01T12:00:00Z',
                retry_after: 900,
                failed_attempts: 5
            };

            service.handleAuthError({ status: 423, error: lockoutResponse });

            const lockoutInfo = service.getLockoutInfo();
            expect(lockoutInfo.isLocked).toBe(true);
            expect(lockoutInfo.failedAttempts).toBe(5);
        });

        it('should handle invalid credentials with attempt info', () => {
            const credentialsResponse: InvalidCredentialsResponse = {
                error: 'Invalid credentials',
                message: 'Invalid credentials',
                failed_attempts: 2,
                remaining_attempts: 3
            };

            service.handleAuthError({ status: 401, error: credentialsResponse });

            const lockoutInfo = service.getLockoutInfo();
            expect(lockoutInfo.isLocked).toBe(false);
            expect(lockoutInfo.failedAttempts).toBe(2);
            expect(lockoutInfo.remainingAttempts).toBe(3);
        });

        it('should check if account is locked', () => {
            // Test when not locked
            expect(service.isAccountLocked()).toBe(false);

            // Test when locked
            const lockoutState: LockoutState = {
                isLocked: true,
                lockedUntil: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
                retryAfter: 60
            };
            localStorage.setItem('lockout_state', JSON.stringify(lockoutState));
            service = TestBed.inject(AuthService);

            expect(service.isAccountLocked()).toBe(true);
        });

        it('should handle expired lockout', () => {
            const lockoutState: LockoutState = {
                isLocked: true,
                lockedUntil: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
                retryAfter: 0
            };
            localStorage.setItem('lockout_state', JSON.stringify(lockoutState));
            service = TestBed.inject(AuthService);

            expect(service.isAccountLocked()).toBe(false);
        });

        it('should get remaining lockout time', () => {
            // Test when not locked
            expect(service.getRemainingLockoutTime()).toBe(0);

            // Test when locked
            const lockoutState: LockoutState = {
                isLocked: true,
                lockedUntil: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
                retryAfter: 60
            };
            localStorage.setItem('lockout_state', JSON.stringify(lockoutState));
            service = TestBed.inject(AuthService);

            const remainingTime = service.getRemainingLockoutTime();
            expect(remainingTime).toBeGreaterThan(0);
            expect(remainingTime).toBeLessThanOrEqual(60);
        });
    });

    describe('MFA State Management', () => {
        it('should initialize MFA state from localStorage', () => {
            const mfaState = {
                requiresMfa: true,
                mfaToken: 'test-mfa-token',
                email: 'test@example.com'
            };
            localStorage.setItem('mfa_token', mfaState.mfaToken);
            localStorage.setItem('mfa_email', mfaState.email);
            service = TestBed.inject(AuthService);

            expect(service.isMfaRequired()).toBe(true);
            expect(service.getMfaState()).toEqual(mfaState);
        });

        it('should clear MFA state', () => {
            // Set up MFA state first
            localStorage.setItem('mfa_token', 'test-mfa-token');
            localStorage.setItem('mfa_email', 'test@example.com');
            service = TestBed.inject(AuthService);

            expect(service.isMfaRequired()).toBe(true);

            service.clearMfaState();

            expect(service.isMfaRequired()).toBe(false);
            expect(localStorage.getItem('mfa_token')).toBeNull();
            expect(localStorage.getItem('mfa_email')).toBeNull();
        });
    });

    describe('Error Handling', () => {
        it('should handle token expiration error', () => {
            localStorage.setItem('auth_token', 'expired-token');
            localStorage.setItem('refresh_token', 'valid-refresh-token');
            service = TestBed.inject(AuthService);

            service.handleAuthError({
                status: 401,
                error: { message: 'Token has expired' }
            });

            // Should attempt to refresh token
            const req = httpMock.expectOne('refresh');
            expect(req.request.method).toBe('POST');
            req.flush(mockLoginResponse);
        });

        it('should handle auth error without token info', () => {
            localStorage.setItem('auth_token', 'invalid-token');
            service = TestBed.inject(AuthService);

            service.handleAuthError({
                status: 401,
                error: { message: 'Invalid token' }
            });

            expect(service.isAuthenticated()).toBe(false);
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
        });
    });
});