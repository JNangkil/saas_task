import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import {
    MfaSetupRequest,
    MfaSetupResponse,
    MfaEnableRequest,
    MfaEnableResponse,
    MfaDisableRequest,
    MfaDisableResponse,
    MfaVerifyRequest,
    MfaVerifyResponse,
    MfaStatus,
    MfaLoginRequest,
    MfaLoginResponse
} from '../models/mfa.models';
import {
    AccountLockoutResponse,
    InvalidCredentialsResponse,
    LockoutState,
    LockoutInfo
} from '../models/account-lockout.models';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: number;
        name: string;
        email: string;
        avatar?: string;
        is_super_admin?: boolean;
    };
    tenant?: {
        id: number;
    } | null;
    tenants?: any[];
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
}

export interface VerifyTokenRequest {
    email: string;
    token: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: LoginResponse['user'] | null;
    token: string | null;
}

export interface MfaState {
    requiresMfa: boolean;
    mfaToken?: string;
    email?: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly TOKEN_KEY = 'auth_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';
    private readonly USER_KEY = 'auth_user';
    private readonly MFA_TOKEN_KEY = 'mfa_token';
    private readonly MFA_EMAIL_KEY = 'mfa_email';
    private readonly LOCKOUT_STATE_KEY = 'lockout_state';

    private authStateSubject = new BehaviorSubject<AuthState>({
        isAuthenticated: false,
        user: null,
        token: null
    });

    private mfaStateSubject = new BehaviorSubject<MfaState>({
        requiresMfa: false
    });

    private lockoutStateSubject = new BehaviorSubject<LockoutState>({
        isLocked: false
    });

    public authState$ = this.authStateSubject.asObservable();
    public mfaState$ = this.mfaStateSubject.asObservable();
    public lockoutState$ = this.lockoutStateSubject.asObservable();

    constructor(
        private apiService: ApiService,
        private http: HttpClient,
        private router: Router
    ) {
        this.initializeAuthFromStorage();
        this.initializeMfaFromStorage();
        this.initializeLockoutFromStorage();
    }

    /**
     * Initialize authentication state from localStorage
     */
    private initializeAuthFromStorage(): void {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const user = localStorage.getItem(this.USER_KEY);

        if (token && user) {
            try {
                const userData = JSON.parse(user);
                this.authStateSubject.next({
                    isAuthenticated: true,
                    user: userData,
                    token: token
                });
            } catch (error) {
                console.error('Error parsing user data from localStorage:', error);
                this.clearAuthData();
            }
        }
    }

    /**
     * Login with email and password
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.apiService.post<LoginResponse>('auth/login', credentials).pipe(
            tap((response: LoginResponse) => {
                this.setAuthData(response);
            }),
            catchError(error => {
                console.error('Login failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Register a new user account
     */
    register(userData: RegisterRequest): Observable<{ message: string }> {
        return this.apiService.post<{ message: string }>('auth/register', userData).pipe(
            catchError(error => {
                console.error('Registration failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Logout the current user
     */
    logout(): Observable<void> {
        return this.apiService.post<void>('logout').pipe(
            tap(() => {
                this.clearAuthData();
                this.router.navigate(['/login']);
            }),
            catchError(error => {
                // Even if the API call fails, clear local auth data
                this.clearAuthData();
                this.router.navigate(['/login']);
                return throwError(() => error);
            })
        );
    }

    /**
     * Request a password reset email
     */
    forgotPassword(request: ForgotPasswordRequest): Observable<{ message: string }> {
        return this.apiService.post<{ message: string }>('auth/password/forgot', request).pipe(
            catchError(error => {
                console.error('Forgot password request failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Reset password with token
     */
    resetPassword(request: ResetPasswordRequest): Observable<{ message: string }> {
        return this.apiService.post<{ message: string }>('auth/password/reset', request).pipe(
            catchError(error => {
                console.error('Password reset failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Verify if a reset token is valid
     */
    verifyResetToken(request: VerifyTokenRequest): Observable<{ valid: boolean; message?: string }> {
        return this.apiService.get<{ valid: boolean; message?: string }>('auth/password/verify', {
            params: {
                email: request.email,
                token: request.token
            }
        }).pipe(
            catchError(error => {
                console.error('Token verification failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Refresh the access token using refresh token
     */
    refreshToken(): Observable<LoginResponse> {
        const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
        if (!refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }

        return this.apiService.post<LoginResponse>('refresh', {
            refresh_token: refreshToken
        }).pipe(
            tap((response: LoginResponse) => {
                this.setAuthData(response);
            }),
            catchError(error => {
                console.error('Token refresh failed:', error);
                this.clearAuthData();
                this.router.navigate(['/login']);
                return throwError(() => error);
            })
        );
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.authStateSubject.value.isAuthenticated;
    }

    /**
     * Get current user
     */
    getCurrentUser(): LoginResponse['user'] | null {
        return this.authStateSubject.value.user;
    }

    /**
     * Get current token
     */
    getToken(): string | null {
        return this.authStateSubject.value.token;
    }

    /**
     * Set authentication data and update state
     */
    private setAuthData(response: LoginResponse): void {
        const { access_token, refresh_token, user } = response;

        // Store in localStorage
        localStorage.setItem(this.TOKEN_KEY, access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));

        // Update state
        this.authStateSubject.next({
            isAuthenticated: true,
            user: user,
            token: access_token
        });
    }

    /**
     * Clear authentication data and update state
     */
    private clearAuthData(): void {
        // Clear localStorage
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);

        // Update state
        this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            token: null
        });
    }

    /**
     * Get authorization header for API requests
     */
    getAuthHeader(): { Authorization: string } | {} {
        const token = this.getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    /**
     * Handle authentication errors and redirect if needed
     */
    handleAuthError(error: any): Observable<never> {
        if (error.status === 423) {
            // Account locked
            const lockoutResponse = error.error as AccountLockoutResponse;
            this.updateLockoutState({
                isLocked: true,
                lockedUntil: lockoutResponse.locked_until,
                retryAfter: lockoutResponse.retry_after,
                failedAttempts: lockoutResponse.failed_attempts
            });
        } else if (error.status === 401) {
            // Check if this is an invalid credentials response with attempt information
            if (error.error?.failed_attempts !== undefined) {
                const credentialsResponse = error.error as InvalidCredentialsResponse;
                this.updateLockoutState({
                    isLocked: false,
                    failedAttempts: credentialsResponse.failed_attempts,
                    remainingAttempts: credentialsResponse.remaining_attempts
                });
            }

            // Token expired or invalid
            if (error.error?.message?.includes('token')) {
                // Try to refresh the token
                this.refreshToken().subscribe({
                    error: () => {
                        this.clearAuthData();
                        this.router.navigate(['/login']);
                    }
                });
            } else {
                // Clear auth and redirect to login
                this.clearAuthData();
                this.router.navigate(['/login']);
            }
        }
        return throwError(() => error);
    }

    /**
     * Login with email and password (first step of MFA login)
     */
    loginWithMfa(credentials: MfaLoginRequest): Observable<MfaLoginResponse> {
        return this.apiService.post<MfaLoginResponse>('auth/login', credentials).pipe(
            tap((response: MfaLoginResponse) => {
                if (response.requires_mfa && response.mfa_token) {
                    // Store MFA token and email temporarily
                    localStorage.setItem(this.MFA_TOKEN_KEY, response.mfa_token);
                    localStorage.setItem(this.MFA_EMAIL_KEY, credentials.email);

                    // Update MFA state
                    this.mfaStateSubject.next({
                        requiresMfa: true,
                        mfaToken: response.mfa_token,
                        email: credentials.email
                    });
                }
            }),
            catchError(error => {
                console.error('MFA login failed:', error);
                this.handleAuthError(error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Verify MFA code during login
     */
    verifyMfaCode(request: MfaVerifyRequest): Observable<MfaVerifyResponse> {
        const mfaToken = localStorage.getItem(this.MFA_TOKEN_KEY);
        const email = localStorage.getItem(this.MFA_EMAIL_KEY);

        if (!mfaToken || !email) {
            return throwError(() => new Error('MFA session not found'));
        }

        return this.apiService.post<MfaVerifyResponse>('auth/mfa/verify', {
            ...request,
            email: email,
            mfa_token: mfaToken
        }).pipe(
            tap((response: MfaVerifyResponse) => {
                // Clear MFA temporary data
                localStorage.removeItem(this.MFA_TOKEN_KEY);
                localStorage.removeItem(this.MFA_EMAIL_KEY);

                // Reset MFA state
                this.mfaStateSubject.next({ requiresMfa: false });

                // Clear lockout state on successful verification
                this.clearLockoutState();

                // Set authentication data
                this.setAuthData(response);
            }),
            catchError(error => {
                console.error('MFA verification failed:', error);
                this.handleAuthError(error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Setup MFA for the user
     */
    setupMfa(request: MfaSetupRequest): Observable<MfaSetupResponse> {
        return this.apiService.post<MfaSetupResponse>('auth/mfa/setup', request).pipe(
            catchError(error => {
                console.error('MFA setup failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Enable MFA after verification
     */
    enableMfa(request: MfaEnableRequest): Observable<MfaEnableResponse> {
        return this.apiService.post<MfaEnableResponse>('auth/mfa/enable', request).pipe(
            catchError(error => {
                console.error('MFA enable failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Disable MFA
     */
    disableMfa(request: MfaDisableRequest): Observable<MfaDisableResponse> {
        return this.apiService.post<MfaDisableResponse>('auth/mfa/disable', request).pipe(
            catchError(error => {
                console.error('MFA disable failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Get MFA status for the current user
     */
    getMfaStatus(): Observable<MfaStatus> {
        return this.apiService.get<MfaStatus>('auth/mfa/status').pipe(
            catchError(error => {
                console.error('Failed to get MFA status:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Check if MFA is required
     */
    isMfaRequired(): boolean {
        return this.mfaStateSubject.value.requiresMfa;
    }

    /**
     * Get MFA state
     */
    getMfaState(): MfaState {
        return this.mfaStateSubject.value;
    }

    /**
     * Clear MFA state
     */
    clearMfaState(): void {
        localStorage.removeItem(this.MFA_TOKEN_KEY);
        localStorage.removeItem(this.MFA_EMAIL_KEY);
        this.mfaStateSubject.next({ requiresMfa: false });
    }

    /**
     * Initialize MFA state from localStorage
     */
    private initializeMfaFromStorage(): void {
        const mfaToken = localStorage.getItem(this.MFA_TOKEN_KEY);
        const email = localStorage.getItem(this.MFA_EMAIL_KEY);

        if (mfaToken && email) {
            this.mfaStateSubject.next({
                requiresMfa: true,
                mfaToken: mfaToken,
                email: email
            });
        }
    }

    /**
     * Initialize lockout state from localStorage
     */
    private initializeLockoutFromStorage(): void {
        const lockoutState = localStorage.getItem(this.LOCKOUT_STATE_KEY);
        if (lockoutState) {
            try {
                const state = JSON.parse(lockoutState) as LockoutState;
                // Check if lockout has expired
                if (state.isLocked && state.lockedUntil) {
                    const lockedUntil = new Date(state.lockedUntil);
                    if (lockedUntil <= new Date()) {
                        // Lockout has expired, clear it
                        this.clearLockoutState();
                        return;
                    }
                }
                this.lockoutStateSubject.next(state);
            } catch (error) {
                console.error('Error parsing lockout state from localStorage:', error);
                this.clearLockoutState();
            }
        }
    }

    /**
     * Update lockout state
     */
    private updateLockoutState(state: LockoutState): void {
        localStorage.setItem(this.LOCKOUT_STATE_KEY, JSON.stringify(state));
        this.lockoutStateSubject.next(state);
    }

    /**
     * Clear lockout state
     */
    private clearLockoutState(): void {
        localStorage.removeItem(this.LOCKOUT_STATE_KEY);
        this.lockoutStateSubject.next({ isLocked: false });
    }

    /**
     * Get current lockout state
     */
    getLockoutState(): LockoutState {
        return this.lockoutStateSubject.value;
    }

    /**
     * Get lockout information
     */
    getLockoutInfo(): LockoutInfo {
        const state = this.lockoutStateSubject.value;
        const info: LockoutInfo = {
            isLocked: state.isLocked,
            failedAttempts: state.failedAttempts,
            remainingAttempts: state.remainingAttempts
        };

        if (state.isLocked && state.lockedUntil) {
            info.lockedUntil = new Date(state.lockedUntil);
            info.retryAfter = state.retryAfter;
        }

        return info;
    }

    /**
     * Check if account is currently locked
     */
    isAccountLocked(): boolean {
        const state = this.lockoutStateSubject.value;
        if (!state.isLocked || !state.lockedUntil) {
            return false;
        }

        // Check if lockout has expired
        const lockedUntil = new Date(state.lockedUntil);
        if (lockedUntil <= new Date()) {
            this.clearLockoutState();
            return false;
        }

        return true;
    }

    /**
     * Get remaining lockout time in seconds
     */
    getRemainingLockoutTime(): number {
        const state = this.lockoutStateSubject.value;
        if (!state.isLocked || !state.lockedUntil) {
            return 0;
        }

        const lockedUntil = new Date(state.lockedUntil);
        const now = new Date();
        const remainingMs = lockedUntil.getTime() - now.getTime();

        return Math.max(0, Math.floor(remainingMs / 1000));
    }
}