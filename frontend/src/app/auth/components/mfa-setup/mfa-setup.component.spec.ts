import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MfaSetupComponent } from './mfa-setup.component';
import { AuthService } from '../../../core/services/auth.service';
import { MfaSetupRequest, MfaSetupResponse, MfaEnableRequest } from '../../../core/models/mfa.models';
import { ToastService } from '../../../services/toast.service';

describe('MfaSetupComponent', () => {
    let component: MfaSetupComponent;
    let fixture: ComponentFixture<MfaSetupComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let formBuilder: FormBuilder;

    const mockMfaSetupResponse: MfaSetupResponse = {
        secret: 'mock-secret',
        qr_code_url: 'mock-qr-url',
        recovery_codes: ['code1', 'code2', 'code3']
    };

    beforeEach(async () => {
        const authSpy = jasmine.createSpyObj('AuthService', [
            'isAuthenticated',
            'setupMfa',
            'enableMfa'
        ]);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const toastSpyObj = jasmine.createSpyObj('ToastService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule],
            declarations: [MfaSetupComponent],
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: authSpy },
                { provide: Router, useValue: routerSpyObj },
                { provide: ToastService, useValue: toastSpyObj }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(MfaSetupComponent);
        component = fixture.componentInstance;
        authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        formBuilder = TestBed.inject(FormBuilder);

        // Set up default spy behaviors
        authServiceSpy.isAuthenticated.and.returnValue(true);
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize setup and verification forms', () => {
        expect(component.setupForm).toBeDefined();
        expect(component.verifyForm).toBeDefined();
        expect(component.setupForm.get('password')).toBeDefined();
        expect(component.verifyForm.get('code')).toBeDefined();
    });

    it('should redirect to login if not authenticated', () => {
        authServiceSpy.isAuthenticated.and.returnValue(false);

        component.ngOnInit();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should have required validator on password field', () => {
        const passwordControl = component.setupForm.get('password');
        passwordControl?.setValue('');
        expect(passwordControl?.invalid).toBeTruthy();
        expect(passwordControl?.errors?.['required']).toBeTruthy();

        passwordControl?.setValue('password');
        expect(passwordControl?.valid).toBeTruthy();
    });

    it('should have required and pattern validators on code field', () => {
        const codeControl = component.verifyForm.get('code');
        codeControl?.setValue('');
        expect(codeControl?.invalid).toBeTruthy();
        expect(codeControl?.errors?.['required']).toBeTruthy();

        codeControl?.setValue('123');
        expect(codeControl?.invalid).toBeTruthy();
        expect(codeControl?.errors?.['pattern']).toBeTruthy();

        codeControl?.setValue('123456');
        expect(codeControl?.valid).toBeTruthy();
    });

    it('should start MFA setup with valid password', fakeAsync(() => {
        const setupRequest: MfaSetupRequest = {
            password: 'password'
        };

        component.setupForm.setValue(setupRequest);
        authServiceSpy.setupMfa.and.returnValue(of(mockMfaSetupResponse));

        component.startMfaSetup();

        expect(component.isLoading).toBe(true);
        expect(component.errorMessage).toBeNull();
        expect(authServiceSpy.setupMfa).toHaveBeenCalledWith(setupRequest);

        tick();

        expect(component.isLoading).toBe(false);
        expect(component.qrCodeUrl).toBe(mockMfaSetupResponse.qr_code_url);
        expect(component.secret).toBe(mockMfaSetupResponse.secret);
        expect(component.recoveryCodes).toEqual(mockMfaSetupResponse.recovery_codes);
        expect(component.showVerificationStep).toBe(true);
        expect(component.successMessage).toBe('MFA setup initiated. Please scan QR code with your authenticator app.');
    }));

    it('should handle MFA setup error', fakeAsync(() => {
        const setupRequest: MfaSetupRequest = {
            password: 'password'
        };

        component.setupForm.setValue(setupRequest);
        authServiceSpy.setupMfa.and.returnValue(throwError({
            error: { message: 'Invalid password' }
        }));

        component.startMfaSetup();

        expect(component.isLoading).toBe(true);
        expect(authServiceSpy.setupMfa).toHaveBeenCalledWith(setupRequest);

        tick();

        expect(component.isLoading).toBe(false);
        expect(component.errorMessage).toBe('Failed to initiate MFA setup. Please check your password and try again.');
    }));

    it('should not start MFA setup with invalid form', () => {
        component.setupForm.setValue({ password: '' });

        component.startMfaSetup();

        expect(component.errorMessage).toBe('Please enter your password to continue.');
        expect(component.isLoading).toBe(false);
        expect(authServiceSpy.setupMfa).not.toHaveBeenCalled();
    });

    it('should enable MFA with valid code', fakeAsync(() => {
        const enableRequest: MfaEnableRequest = {
            code: '123456'
        };

        component.verifyForm.setValue(enableRequest);
        authServiceSpy.enableMfa.and.returnValue(of({
            message: 'MFA enabled successfully'
        }));

        component.verifyAndEnableMfa();

        expect(component.isLoading).toBe(true);
        expect(component.errorMessage).toBeNull();
        expect(authServiceSpy.enableMfa).toHaveBeenCalledWith(enableRequest);

        tick();

        expect(component.isLoading).toBe(false);
        expect(component.successMessage).toBe('MFA enabled successfully');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile']);
    }));

    it('should handle MFA enable error', fakeAsync(() => {
        const enableRequest: MfaEnableRequest = {
            code: '123456'
        };

        component.verifyForm.setValue(enableRequest);
        authServiceSpy.enableMfa.and.returnValue(throwError({
            error: { message: 'Invalid code' }
        }));

        component.verifyAndEnableMfa();

        expect(component.isLoading).toBe(true);
        expect(authServiceSpy.enableMfa).toHaveBeenCalledWith(enableRequest);

        tick();

        expect(component.isLoading).toBe(false);
        expect(component.errorMessage).toBe('Invalid verification code. Please try again.');
    }));

    it('should not enable MFA with invalid form', () => {
        component.verifyForm.setValue({ code: '123' });

        component.verifyAndEnableMfa();

        expect(component.errorMessage).toBe('Please enter a valid 6-digit verification code.');
        expect(component.isLoading).toBe(false);
        expect(authServiceSpy.enableMfa).not.toHaveBeenCalled();
    });

    it('should toggle recovery codes visibility', () => {
        expect(component.showRecoveryCodes).toBe(false);

        component.toggleRecoveryCodes();

        expect(component.showRecoveryCodes).toBe(true);

        component.toggleRecoveryCodes();

        expect(component.showRecoveryCodes).toBe(false);
    });

    it('should copy recovery codes to clipboard', fakeAsync(() => {
        const mockCodes = ['code1', 'code2', 'code3'];
        component.recoveryCodes = mockCodes;

        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

        component.copyRecoveryCodes();

        tick();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('code1\ncode2\ncode3');
        expect(component.successMessage).toBe('Recovery codes copied to clipboard!');
    }));

    it('should handle clipboard copy error', fakeAsync(() => {
        const mockCodes = ['code1', 'code2', 'code3'];
        component.recoveryCodes = mockCodes;

        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('Copy failed')));

        component.copyRecoveryCodes();

        tick();

        expect(component.errorMessage).toBe('Failed to copy recovery codes. Please copy them manually.');
    }));

    it('should copy secret to clipboard', fakeAsync(() => {
        component.secret = 'mock-secret';

        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());

        component.copyToClipboard('mock-secret');

        tick();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mock-secret');
        expect(component.successMessage).toBe('Secret copied to clipboard!');
    }));

    it('should handle secret copy error', fakeAsync(() => {
        component.secret = 'mock-secret';

        spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.reject(new Error('Copy failed')));

        component.copyToClipboard('mock-secret');

        tick();

        expect(component.errorMessage).toBe('Failed to copy secret. Please copy it manually.');
    }));

    it('should go back from verification step', () => {
        component.showVerificationStep = true;
        component.qrCodeUrl = 'mock-qr-url';
        component.secret = 'mock-secret';
        component.recoveryCodes = ['code1', 'code2'];

        component.goBack();

        expect(component.showVerificationStep).toBe(false);
        expect(component.qrCodeUrl).toBeNull();
        expect(component.secret).toBeNull();
        expect(component.recoveryCodes).toEqual([]);
        expect(component.verifyForm.get('code')?.value).toBe('');
    });

    it('should go back from setup step', () => {
        spyOn(component, 'goBack');

        component.goBack();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('should clear success message after timeout', fakeAsync(() => {
        component.successMessage = 'Test message';

        // Simulate timeout
        setTimeout(() => {
            expect(component.successMessage).toBeNull();
        }, 3000);

        tick(3000);

        expect(component.successMessage).toBeNull();
    }));

    it('should show setup step initially', () => {
        expect(component.showVerificationStep).toBe(false);
        expect(component.qrCodeUrl).toBeNull();
        expect(component.secret).toBeNull();
        expect(component.recoveryCodes).toEqual([]);
    });

    it('should show verification step after setup', fakeAsync(() => {
        const setupRequest: MfaSetupRequest = {
            password: 'password'
        };

        component.setupForm.setValue(setupRequest);
        authServiceSpy.setupMfa.and.returnValue(of(mockMfaSetupResponse));

        component.startMfaSetup();

        tick();

        expect(component.showVerificationStep).toBe(true);
        expect(component.qrCodeUrl).toBe(mockMfaSetupResponse.qr_code_url);
        expect(component.secret).toBe(mockMfaSetupResponse.secret);
        expect(component.recoveryCodes).toEqual(mockMfaSetupResponse.recovery_codes);
    }));

    it('should disable form during loading', () => {
        component.isLoading = true;
        fixture.detectChanges();

        const setupForm = fixture.nativeElement.querySelector('#setup-form');
        const verifyForm = fixture.nativeElement.querySelector('#verify-form');

        if (component.showVerificationStep) {
            expect(verifyForm.querySelectorAll('input, button').every(
                (el: HTMLElement) => (el as HTMLInputElement).disabled || el.classList.contains('disabled')
            )).toBe(true);
        } else {
            expect(setupForm.querySelectorAll('input, button').every(
                (el: HTMLElement) => (el as HTMLInputElement).disabled || el.classList.contains('disabled')
            )).toBe(true);
        }
    });

    it('should enable form after loading completes', fakeAsync(() => {
        const setupRequest: MfaSetupRequest = {
            password: 'password'
        };

        component.setupForm.setValue(setupRequest);
        component.isLoading = true;
        authServiceSpy.setupMfa.and.returnValue(of(mockMfaSetupResponse));

        component.startMfaSetup();
        tick();

        fixture.detectChanges();

        const setupForm = fixture.nativeElement.querySelector('#setup-form');
        const verifyForm = fixture.nativeElement.querySelector('#verify-form');

        if (component.showVerificationStep) {
            expect(verifyForm.querySelectorAll('input, button').every(
                (el: HTMLElement) => !(el as HTMLInputElement).disabled && !el.classList.contains('disabled')
            )).toBe(true);
        } else {
            expect(setupForm.querySelectorAll('input, button').every(
                (el: HTMLElement) => !(el as HTMLInputElement).disabled && !el.classList.contains('disabled')
            )).toBe(true);
        }
    }));

    it('should display error message when present', () => {
        component.errorMessage = 'Test error message';
        fixture.detectChanges();

        const errorElement = fixture.nativeElement.querySelector('.error-message');
        expect(errorElement).toBeTruthy();
        expect(errorElement.textContent).toContain('Test error message');
    });

    it('should display success message when present', () => {
        component.successMessage = 'Test success message';
        fixture.detectChanges();

        const successElement = fixture.nativeElement.querySelector('.success-message');
        expect(successElement).toBeTruthy();
        expect(successElement.textContent).toContain('Test success message');
    });

    it('should hide error message when cleared', () => {
        component.errorMessage = 'Test error message';
        fixture.detectChanges();

        let errorElement = fixture.nativeElement.querySelector('.error-message');
        expect(errorElement).toBeTruthy();

        component.errorMessage = null;
        fixture.detectChanges();

        errorElement = fixture.nativeElement.querySelector('.error-message');
        expect(errorElement).toBeFalsy();
    });

    it('should hide success message when cleared', () => {
        component.successMessage = 'Test success message';
        fixture.detectChanges();

        let successElement = fixture.nativeElement.querySelector('.success-message');
        expect(successElement).toBeTruthy();

        component.successMessage = null;
        fixture.detectChanges();

        successElement = fixture.nativeElement.querySelector('.success-message');
        expect(successElement).toBeFalsy();
    });
});