import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProfileSecurityComponent } from './profile-security.component';
import { SecurityService } from '../../../services/security.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { MfaStatus, UserSession, SecurityLogEntry, BackupCodes } from '../../../models/security.model';
import { ProfileBasicComponent } from '../profile-basic/profile-basic.component';
import { PasswordChangeComponent } from './password-change/password-change.component';
import { MfaSettingsComponent } from './mfa-settings/mfa-settings.component';
import { ActiveSessionsComponent } from './active-sessions/active-sessions.component';
import { SecurityLogComponent } from './security-log/security-log.component';
import { BackupCodesComponent } from './backup-codes/backup-codes.component';

describe('ProfileSecurityComponent', () => {
    let component: ProfileSecurityComponent;
    let fixture: ComponentFixture<ProfileSecurityComponent>;
    let securityServiceSpy: jasmine.SpyObj<SecurityService>;
    let userServiceSpy: jasmine.SpyObj<UserService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;

    const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
    };

    const mockMfaStatus: MfaStatus = {
        enabled: true,
        setup: true,
        recovery_codes_count: 10
    };

    const mockSessions: UserSession[] = [
        {
            id: 1,
            token_id: 1,
            ip_address: '192.168.1.1',
            device: 'Desktop',
            browser: 'Chrome',
            platform: 'Windows',
            last_activity: '2023-01-01T12:00:00Z',
            formatted_last_activity: '2023-01-01 12:00:00',
            created_at: '2023-01-01T00:00:00Z',
            is_current: true
        }
    ];

    const mockSecurityLogs: SecurityLogEntry[] = [
        {
            id: 1,
            event_type: 'login',
            formatted_event_type: 'Login',
            description: 'User logged in',
            ip_address: '192.168.1.1',
            icon_class: 'success',
            color_class: 'green',
            metadata: {},
            created_at: '2023-01-01T00:00:00Z',
            formatted_created_at: '2023-01-01 00:00:00'
        }
    ];

    const mockBackupCodes: BackupCodes = {
        codes: ['code1', 'code2', 'code3'],
        codes_count: 3
    };

    beforeEach(async () => {
        const securitySpy = jasmine.createSpyObj('SecurityService', [
            'getMfaStatus',
            'getActiveSessions',
            'getSecurityLog',
            'getBackupCodes'
        ]);
        const userSpyObj = jasmine.createSpyObj('UserService', ['getCurrentUser']);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const activatedRouteSpyObj = jasmine.createSpyObj('ActivatedRoute', ['queryParams']);
        const toastSpyObj = jasmine.createSpyObj('ToastService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [
                CommonModule,
                ProfileBasicComponent,
                PasswordChangeComponent,
                MfaSettingsComponent,
                ActiveSessionsComponent,
                SecurityLogComponent,
                BackupCodesComponent
            ],
            declarations: [ProfileSecurityComponent],
            providers: [
                { provide: SecurityService, useValue: securitySpy },
                { provide: UserService, useValue: userSpyObj },
                { provide: Router, useValue: routerSpyObj },
                { provide: ActivatedRoute, useValue: activatedRouteSpyObj },
                { provide: ToastService, useValue: toastSpyObj }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProfileSecurityComponent);
        component = fixture.componentInstance;
        securityServiceSpy = TestBed.inject(SecurityService) as jasmine.SpyObj<SecurityService>;
        userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        activatedRouteSpy = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with profile tab active', () => {
        expect(component.activeTab).toBe('profile');
    });

    it('should load user data on initialization', fakeAsync(() => {
        userServiceSpy.getCurrentUser.and.returnValue(of({
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        }));

        component.ngOnInit();

        tick();

        expect(component.isLoadingUser).toBe(false);
        expect(component.user).toEqual(mockUser);
    }));

    it('should handle user data loading error', fakeAsync(() => {
        userServiceSpy.getCurrentUser.and.returnValue(throwError({ message: 'Failed to load user' }));

        component.ngOnInit();

        tick();

        expect(component.isLoadingUser).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to load user data: Failed to load user');
    }));

    it('should switch to security tab', () => {
        component.switchTab('security');

        expect(component.activeTab).toBe('security');
        expect(routerSpy.navigate).toHaveBeenCalledWith([], {
            relativeTo: jasmine.any(Object),
            queryParams: { tab: 'security' },
            queryParamsHandling: 'merge'
        });
    });

    it('should switch to profile tab', () => {
        component.switchTab('profile');

        expect(component.activeTab).toBe('profile');
        expect(routerSpy.navigate).toHaveBeenCalledWith([], {
            relativeTo: jasmine.any(Object),
            queryParams: { tab: null },
            queryParamsHandling: 'merge'
        });
    });

    it('should load security data when switching to security tab', fakeAsync(() => {
        securityServiceSpy.getMfaStatus.and.returnValue(of(mockMfaStatus));
        securityServiceSpy.getActiveSessions.and.returnValue(of({ sessions: mockSessions, count: mockSessions.length }));
        securityServiceSpy.getSecurityLog.and.returnValue(of({ logs: mockSecurityLogs, count: mockSecurityLogs.length, limit: 50, offset: 0 }));
        securityServiceSpy.getBackupCodes.and.returnValue(of(mockBackupCodes));

        component.switchTab('security');

        tick();

        expect(component.isLoadingMfa).toBe(false);
        expect(component.mfaStatus).toEqual(mockMfaStatus);
        expect(component.isLoadingSessions).toBe(false);
        expect(component.sessions).toEqual(mockSessions);
        expect(component.isLoadingLogs).toBe(false);
        expect(component.securityLogs).toEqual(mockSecurityLogs);
        expect(component.isLoadingBackupCodes).toBe(false);
        expect(component.backupCodes).toEqual(mockBackupCodes);
    }));

    it('should handle MFA status loading error', fakeAsync(() => {
        securityServiceSpy.getMfaStatus.and.returnValue(throwError({ message: 'Failed to load MFA status' }));

        component.loadMfaStatus();

        tick();

        expect(component.isLoadingMfa).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to load MFA status: Failed to load MFA status');
    }));

    it('should handle sessions loading error', fakeAsync(() => {
        securityServiceSpy.getActiveSessions.and.returnValue(throwError({ message: 'Failed to load sessions' }));

        component.loadSessions();

        tick();

        expect(component.isLoadingSessions).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to load sessions: Failed to load sessions');
    }));

    it('should handle security logs loading error', fakeAsync(() => {
        securityServiceSpy.getSecurityLog.and.returnValue(throwError({ message: 'Failed to load logs' }));

        component.loadSecurityLogs();

        tick();

        expect(component.isLoadingLogs).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to load security logs: Failed to load logs');
    }));

    it('should handle backup codes loading error', fakeAsync(() => {
        securityServiceSpy.getBackupCodes.and.returnValue(throwError({ message: 'Failed to load backup codes' }));

        component.loadBackupCodes();

        tick();

        expect(component.isLoadingBackupCodes).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to load backup codes: Failed to load backup codes');
    }));

    it('should refresh all security data', fakeAsync(() => {
        spyOn(component as any, 'loadSecurityData');
        securityServiceSpy.getMfaStatus.and.returnValue(of(mockMfaStatus));
        securityServiceSpy.getActiveSessions.and.returnValue(of({ sessions: mockSessions, count: mockSessions.length }));
        securityServiceSpy.getSecurityLog.and.returnValue(of({ logs: mockSecurityLogs, count: mockSecurityLogs.length, limit: 50, offset: 0 }));
        securityServiceSpy.getBackupCodes.and.returnValue(of(mockBackupCodes));

        component.refreshSecurityData();

        tick();

        expect((component as any).loadSecurityData).toHaveBeenCalled();
        expect(toastServiceSpy.success).toHaveBeenCalledWith('Security data refreshed');
    }));

    it('should handle MFA status change', fakeAsync(() => {
        securityServiceSpy.getMfaStatus.and.returnValue(of(mockMfaStatus));
        securityServiceSpy.getBackupCodes.and.returnValue(of(mockBackupCodes));

        component.onMfaStatusChanged();

        tick();

        expect(component.mfaStatus).toEqual(mockMfaStatus);
        expect(component.backupCodes).toEqual(mockBackupCodes);
    }));

    it('should handle session revocation', fakeAsync(() => {
        securityServiceSpy.getActiveSessions.and.returnValue(of({ sessions: mockSessions, count: mockSessions.length }));

        component.onSessionRevoked();

        tick();

        expect(component.sessions).toEqual(mockSessions);
        expect(toastServiceSpy.success).toHaveBeenCalledWith('Session revoked successfully');
    }));

    it('should handle all sessions revocation', fakeAsync(() => {
        securityServiceSpy.getActiveSessions.and.returnValue(of({ sessions: mockSessions, count: mockSessions.length }));

        component.onAllSessionsRevoked();

        tick();

        expect(component.sessions).toEqual(mockSessions);
        expect(toastServiceSpy.success).toHaveBeenCalledWith('All other sessions revoked');
    }));

    it('should handle backup codes regeneration', fakeAsync(() => {
        securityServiceSpy.getBackupCodes.and.returnValue(of(mockBackupCodes));

        component.onBackupCodesRegenerated();

        tick();

        expect(component.backupCodes).toEqual(mockBackupCodes);
        expect(toastServiceSpy.success).toHaveBeenCalledWith('Backup codes regenerated');
    }));

    it('should handle profile update', fakeAsync(() => {
        userServiceSpy.getCurrentUser.and.returnValue(of(mockUser as any));

        component.onProfileUpdated();

        tick();

        expect(component.user).toEqual(mockUser);
        expect(toastServiceSpy.success).toHaveBeenCalledWith('Profile updated successfully');
    }));

    it('should handle tab query parameter on initialization', fakeAsync(() => {
        activatedRouteSpy.queryParams = of({ tab: 'security' });
        userServiceSpy.getCurrentUser.and.returnValue(of(mockUser));
        securityServiceSpy.getMfaStatus.and.returnValue(of(mockMfaStatus));
        securityServiceSpy.getActiveSessions.and.returnValue(of({ sessions: mockSessions, count: mockSessions.length }));
        securityServiceSpy.getSecurityLog.and.returnValue(of({ logs: mockSecurityLogs }));
        securityServiceSpy.getBackupCodes.and.returnValue(of(mockBackupCodes));

        component.ngOnInit();

        tick();

        expect(component.activeTab).toBe('security');
        expect(component.mfaStatus).toEqual(mockMfaStatus);
        expect(component.sessions).toEqual(mockSessions);
        expect(component.securityLogs).toEqual(mockSecurityLogs);
        expect(component.backupCodes).toEqual(mockBackupCodes);
    }));

    it('should handle empty tab query parameter', fakeAsync(() => {
        activatedRouteSpy.queryParams = of({});
        (userServiceSpy as any).getCurrentUser.and.returnValue(of({
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
        }));

        component.ngOnInit();

        tick();

        expect(component.activeTab).toBe('profile');
        expect(component.user).toEqual(mockUser);
    }));

    it('should clean up subscriptions on destroy', () => {
        spyOn(component['destroy$'], 'next');
        spyOn(component['destroy$'], 'complete');

        component.ngOnDestroy();

        expect(component['destroy$'].next).toHaveBeenCalled();
        expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    it('should show loading states during data loading', () => {
        component.isLoadingUser = true;
        component.isLoadingMfa = true;
        component.isLoadingSessions = true;
        component.isLoadingLogs = true;
        component.isLoadingBackupCodes = true;

        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.loading-user')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.loading-mfa')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.loading-sessions')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.loading-logs')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.loading-backup-codes')).toBeTruthy();
    });

    it('should hide loading states when data is loaded', () => {
        component.isLoadingUser = false;
        component.isLoadingMfa = false;
        component.isLoadingSessions = false;
        component.isLoadingLogs = false;
        component.isLoadingBackupCodes = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.loading-user')).toBeFalsy();
        expect(fixture.nativeElement.querySelector('.loading-mfa')).toBeFalsy();
        expect(fixture.nativeElement.querySelector('.loading-sessions')).toBeFalsy();
        expect(fixture.nativeElement.querySelector('.loading-logs')).toBeFalsy();
        expect(fixture.nativeElement.querySelector('.loading-backup-codes')).toBeFalsy();
    });

    it('should display user data when loaded', () => {
        component.user = mockUser;
        component.isLoadingUser = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain(mockUser.name);
        expect(fixture.nativeElement.textContent).toContain(mockUser.email);
    });

    it('should display MFA status when loaded', () => {
        component.mfaStatus = mockMfaStatus;
        component.isLoadingMfa = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('MFA Status');
        if (mockMfaStatus.enabled) {
            expect(fixture.nativeElement.textContent).toContain('Enabled');
        } else {
            expect(fixture.nativeElement.textContent).toContain('Disabled');
        }
    });

    it('should display sessions when loaded', () => {
        component.sessions = mockSessions;
        component.isLoadingSessions = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Active Sessions');
        expect(fixture.nativeElement.textContent).toContain(mockSessions[0].ip_address);
    });

    it('should display security logs when loaded', () => {
        component.securityLogs = mockSecurityLogs;
        component.isLoadingLogs = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Security Log');
        expect(fixture.nativeElement.textContent).toContain(mockSecurityLogs[0].event_type);
    });

    it('should display backup codes when loaded', () => {
        component.backupCodes = mockBackupCodes;
        component.isLoadingBackupCodes = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Backup Codes');
        expect(fixture.nativeElement.textContent).toContain(mockBackupCodes.codes![0]);
    });

    it('should highlight active tab', () => {
        component.activeTab = 'security';
        fixture.detectChanges();

        const profileTab = fixture.nativeElement.querySelector('[data-tab="profile"]');
        const securityTab = fixture.nativeElement.querySelector('[data-tab="security"]');

        expect(profileTab).not.toHaveClass('active');
        expect(securityTab).toHaveClass('active');
    });

    it('should handle empty user data', () => {
        component.user = null;
        component.isLoadingUser = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('Test User');
        expect(fixture.nativeElement.textContent).not.toContain('test@example.com');
    });

    it('should handle empty MFA status', () => {
        component.mfaStatus = null;
        component.isLoadingMfa = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('MFA Status');
        expect(fixture.nativeElement.textContent).not.toContain('Enabled');
        expect(fixture.nativeElement.textContent).not.toContain('Disabled');
    });

    it('should handle empty sessions', () => {
        component.sessions = [];
        component.isLoadingSessions = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Active Sessions');
        expect(fixture.nativeElement.textContent).toContain('No active sessions');
    });

    it('should handle empty security logs', () => {
        component.securityLogs = [];
        component.isLoadingLogs = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Security Log');
        expect(fixture.nativeElement.textContent).toContain('No security activity');
    });

    it('should handle empty backup codes', () => {
        component.backupCodes = null;
        component.isLoadingBackupCodes = false;

        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Backup Codes');
        expect(fixture.nativeElement.textContent).toContain('No backup codes available');
    });
});