import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MfaVerifyComponent } from './mfa-verify.component';
import { AuthService } from '../../../core/services/auth.service';
import { MfaVerifyRequest } from '../../../core/models/mfa.models';
import { ToastService } from '../../../services/toast.service';

describe('MfaVerifyComponent', () => {
    let component: MfaVerifyComponent;
    let fixture: ComponentFixture<MfaVerifyComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let formBuilder: FormBuilder;

    const mockMfaVerifyResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com'
        }
    };

    beforeEach(async () => {
        const authSpy = jasmine.createSpyObj('AuthService', [
            'isMfaRequired',
            'getMfaState',
            'verifyMfaCode',
            'clearMfaState'
        ]);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const toastSpyObj = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule],
            declarations: [MfaVerifyComponent],
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: authSpy },
                { provide: Router, useValue: routerSpyObj },
                { provide: ToastService, useValue: toastSpyObj }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(MfaVerifyComponent);
        component = fixture.componentInstance;
        authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        formBuilder = TestBed.inject(FormBuilder);

        // Set up default spy behaviors
        authServiceSpy.isMfaRequired.and.returnValue(true);
        authServiceSpy.getMfaState.and.returnValue({
            requiresMfa: true,
            mfaToken: 'mock-mfa-token',
            email: 'test@example.com'
        });
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize verification form with code field', () => {
        expect((component as any).verifyForm).toBeDefined();
        expect((component as any).verifyForm.get('code')).toBeDefined();
    });

    it('should redirect to login if MFA is not required', () => {
        authServiceSpy.isMfaRequired.and.returnValue(false);

        component.ngOnInit();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should display user email from MFA state', () => {
        authServiceSpy.getMfaState.and.returnValue({
            requiresMfa: true,
            mfaToken: 'mock-mfa-token',
            email: 'user@example.com'
        });

        component.ngOnInit();

        expect(component.userEmail).toBe('user@example.com');
    });

    it('should have required and pattern validators on code field', () => {
        const codeControl = (component as any).verifyForm.get('code');
        codeControl?.setValue('');
        expect(codeControl?.invalid).toBeTruthy();
        expect(codeControl?.errors?.['required']).toBeTruthy();

        codeControl?.setValue('123');
        expect(codeControl?.invalid).toBeTruthy();
        expect(codeControl?.errors?.['pattern']).toBeTruthy();

        codeControl?.setValue('123456');
        expect(codeControl?.valid).toBeTruthy();
    });

    it('should verify MFA code with valid input', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '123456'
        };

        (component as any).verifyForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(of(mockMfaVerifyResponse));

        (component as any).verifyMfa();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith(verifyRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.success).toHaveBeenCalledWith('MFA verification successful!');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspaces']);
    }));

    it('should handle MFA verification error', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '123456'
        };

        (component as any).verifyForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(throwError({
            error: { message: 'Invalid verification code' }
        }));

        (component as any).verifyMfa();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith(verifyRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Invalid verification code');
    }));

    it('should handle account lockout during MFA verification', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '123456'
        };

        (component as any).verifyForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(throwError({
            status: 423,
            error: {
                error: 'Account locked',
                message: 'Your account has been temporarily locked'
            }
        }));

        (component as any).verifyMfa();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith(verifyRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Your account has been temporarily locked');
    }));

    it('should not verify with invalid form', () => {
        (component as any).verifyForm.setValue({ code: '123' });

        (component as any).verifyMfa();

        expect(component.errorMessage).toBe('Please enter a valid 6-digit verification code.');
        expect(component.isSubmitting).toBe(false);
        expect(authServiceSpy.verifyMfaCode).not.toHaveBeenCalled();
    });

    it('should navigate back to login', () => {
        (component as any).cancel();

        expect(authServiceSpy.clearMfaState).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should correctly identify form field errors', () => {
        const codeControl = (component as any).verifyForm.get('code');

        // Test code field errors
        codeControl?.setValue('');
        codeControl?.markAsTouched();
        expect(component.hasError('code', 'required')).toBe(true);

        codeControl?.setValue('123');
        codeControl?.markAsTouched();
        expect(component.hasError('code', 'pattern')).toBe(true);

        codeControl?.setValue('123456');
        expect(component.hasError('code', 'required')).toBe(false);
        expect(component.hasError('code', 'pattern')).toBe(false);

        // Test non-existent control
        expect(component.hasError('nonexistent', 'required')).toBe(false);
    });

    it('should mark form as touched', () => {
        const codeControl = component.verificationForm.get('code');

        spyOn(codeControl!, 'markAsTouched');

        component.markFormAsTouched();

        expect(codeControl?.markAsTouched).toHaveBeenCalled();
    });

    it('should reset submitting state after form reset', () => {
        component.isSubmitting = true;
        (component as any).verifyForm.reset();

        expect(component.isSubmitting).toBe(false);
    });

    it('should handle form submission with trimmed code', () => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '  123456  '
        };

        (component as any).verifyForm.setValue({ code: '  123456  ' });
        authServiceSpy.verifyMfaCode.and.returnValue(of(mockMfaVerifyResponse));

        (component as any).verifyMfa();

        // Should submit with trimmed code
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith({
            ...verifyRequest,
            code: '123456'
        });
    });

    it('should disable form during submission', () => {
        component.isSubmitting = true;
        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        const input = form.querySelector('input[type="text"]');
        const button = form.querySelector('button[type="submit"]');

        expect(input.disabled).toBe(true);
        expect(button.disabled).toBe(true);
    });

    it('should enable form after submission completes', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '123456'
        };

        (component as any).verifyForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(of(mockMfaVerifyResponse));

        (component as any).verifyMfa();
        tick();

        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        const input = form.querySelector('input[type="text"]');
        const button = form.querySelector('button[type="submit"]');

        expect(input.disabled).toBe(false);
        expect(button.disabled).toBe(false);
    }));

    it('should display error message when present', () => {
        component.errorMessage = 'Test error message';
        fixture.detectChanges();

        const errorElement = fixture.nativeElement.querySelector('.error-message');
        expect(errorElement).toBeTruthy();
        expect(errorElement.textContent).toContain('Test error message');
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

    it('should display user email', () => {
        component.userEmail = 'test@example.com';
        fixture.detectChanges();

        const emailElement = fixture.nativeElement.querySelector('.user-email');
        expect(emailElement).toBeTruthy();
        expect(emailElement.textContent).toContain('test@example.com');
    });

    it('should handle recovery code input', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            recovery_code: 'recovery-code-123'
        };

        (component as any).verifyForm.setValue({ code: 'recovery-code-123' });
        authServiceSpy.verifyMfaCode.and.returnValue(of(mockMfaVerifyResponse));

        (component as any).verifyMfa();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith({
            ...verifyRequest,
            code: 'recovery-code-123'
        });

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.success).toHaveBeenCalledWith('MFA verification successful!');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspaces']);
    }));

    it('should handle network error', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '123456'
        };

        (component as any).verifyForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(throwError({ status: 0 }));

        (component as any).verifyMfa();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith(verifyRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Network error. Please try again.');
    }));

    it('should handle timeout error', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '123456'
        };

        (component as any).verifyForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(throwError({ status: 408 }));

        (component as any).verifyMfa();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith(verifyRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Request timed out. Please try again.');
    }));

    it('should handle server error response', fakeAsync(() => {
        const verifyRequest: MfaVerifyRequest = {
            email: 'test@example.com',
            password: 'password',
            code: '123456'
        };

        (component as any).verifyForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(throwError({
            status: 500,
            error: { message: 'Internal server error' }
        }));

        (component as any).verifyMfa();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.verifyMfaCode).toHaveBeenCalledWith(verifyRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Internal server error');
    }));

    it('should clear error message on new submission', () => {
        component.errorMessage = 'Previous error';
        component.verificationForm.setValue({ code: '123456' });
        authServiceSpy.verifyMfaCode.and.returnValue(of(mockMfaVerifyResponse));

        component.verifyCode();

        expect(component.errorMessage).toBeNull();
    });

    it('should handle missing MFA state', () => {
        authServiceSpy.getMfaState.and.returnValue({
            requiresMfa: false,
            mfaToken: null,
            email: null
        });

        component.ngOnInit();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should handle partial MFA state', () => {
        authServiceSpy.getMfaState.and.returnValue({
            requiresMfa: true,
            mfaToken: 'mock-mfa-token',
            email: null // Missing email
        });

        component.ngOnInit();

        expect(component.userEmail).toBe('');
    });
});