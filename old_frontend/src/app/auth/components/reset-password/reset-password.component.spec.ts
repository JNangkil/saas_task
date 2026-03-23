import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthService, ResetPasswordRequest, VerifyTokenRequest } from '../../../core/services/auth.service';
import { ToastService } from '../../../services/toast.service';

describe('ResetPasswordComponent', () => {
    let component: ResetPasswordComponent;
    let fixture: ComponentFixture<ResetPasswordComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let activatedRouteSpy: jasmine.SpyObj<ActivatedRoute>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let formBuilder: FormBuilder;

    beforeEach(async () => {
        const authSpy = jasmine.createSpyObj('AuthService', ['resetPassword', 'verifyResetToken']);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const activatedRouteSpyObj = jasmine.createSpyObj('ActivatedRoute', ['queryParams']);
        const toastSpyObj = jasmine.createSpyObj('ToastService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule],
            declarations: [ResetPasswordComponent],
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: authSpy },
                { provide: Router, useValue: routerSpyObj },
                { provide: ActivatedRoute, useValue: activatedRouteSpyObj },
                { provide: ToastService, useValue: toastSpyObj }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ResetPasswordComponent);
        component = fixture.componentInstance;
        authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        activatedRouteSpy = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        formBuilder = TestBed.inject(FormBuilder);

        // Set up default route params
        activatedRouteSpy.queryParams = of({ token: 'test-token', email: 'test@example.com' });
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize reset password form with required fields', () => {
        expect(component.resetPasswordForm).toBeDefined();
        expect(component.resetPasswordForm.get('email')).toBeDefined();
        expect(component.resetPasswordForm.get('token')).toBeDefined();
        expect(component.resetPasswordForm.get('password')).toBeDefined();
        expect(component.resetPasswordForm.get('password_confirmation')).toBeDefined();
    });

    it('should populate form from query parameters', () => {
        activatedRouteSpy.queryParams = of({
            token: 'test-token-123',
            email: 'test@example.com'
        });

        component.ngOnInit();

        expect(component.resetPasswordForm.get('token')?.value).toBe('test-token-123');
        expect(component.resetPasswordForm.get('email')?.value).toBe('test@example.com');
    });

    it('should have required validators on all fields', () => {
        // Test email field
        const emailControl = component.resetPasswordForm.get('email');
        emailControl?.setValue('');
        expect(emailControl?.invalid).toBeTruthy();
        expect(emailControl?.errors?.['required']).toBeTruthy();

        emailControl?.setValue('invalid-email');
        expect(emailControl?.invalid).toBeTruthy();
        expect(emailControl?.errors?.['email']).toBeTruthy();

        // Test token field
        const tokenControl = component.resetPasswordForm.get('token');
        tokenControl?.setValue('');
        expect(tokenControl?.invalid).toBeTruthy();
        expect(tokenControl?.errors?.['required']).toBeTruthy();

        // Test password field
        const passwordControl = component.resetPasswordForm.get('password');
        passwordControl?.setValue('');
        expect(passwordControl?.invalid).toBeTruthy();
        expect(passwordControl?.errors?.['required']).toBeTruthy();

        passwordControl?.setValue('short');
        expect(passwordControl?.invalid).toBeTruthy();
        expect(passwordControl?.errors?.['minlength']).toBeTruthy();

        // Test password confirmation field
        const confirmationControl = component.resetPasswordForm.get('password_confirmation');
        confirmationControl?.setValue('');
        expect(confirmationControl?.invalid).toBeTruthy();
        expect(confirmationControl?.errors?.['required']).toBeTruthy();
    });

    it('should validate password confirmation', () => {
        const passwordControl = component.resetPasswordForm.get('password');
        const confirmationControl = component.resetPasswordForm.get('password_confirmation');

        passwordControl?.setValue('password123');
        confirmationControl?.setValue('different');

        expect(confirmationControl?.invalid).toBeTruthy();
        expect(confirmationControl?.errors?.['passwordMismatch']).toBeTruthy();

        confirmationControl?.setValue('password123');
        expect(confirmationControl?.valid).toBeTruthy();
    });

    it('should not submit form if invalid', () => {
        spyOn(component as any, 'markFormGroupTouched');
        component.resetPasswordForm.setValue({
            email: '',
            token: '',
            password: '',
            password_confirmation: ''
        });

        component.onSubmit();

        expect((component as any).markFormGroupTouched).toHaveBeenCalledWith(component.resetPasswordForm);
        expect(component.isSubmitting).toBe(false);
    });

    it('should submit form with valid data', fakeAsync(() => {
        const resetPasswordRequest: ResetPasswordRequest = {
            email: 'test@example.com',
            token: 'test-token',
            password: 'newpassword123',
            password_confirmation: 'newpassword123'
        };

        component.resetPasswordForm.setValue(resetPasswordRequest);
        authServiceSpy.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));

        component.onSubmit();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.resetPassword).toHaveBeenCalledWith(resetPasswordRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.success).toHaveBeenCalledWith(
            'Password has been successfully reset. Please log in with your new password.'
        );
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('should handle reset password error', fakeAsync(() => {
        const resetPasswordRequest: ResetPasswordRequest = {
            email: 'test@example.com',
            token: 'test-token',
            password: 'newpassword123',
            password_confirmation: 'newpassword123'
        };

        component.resetPasswordForm.setValue(resetPasswordRequest);
        authServiceSpy.resetPassword.and.returnValue(throwError({
            message: 'Invalid token'
        }));

        component.onSubmit();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.resetPassword).toHaveBeenCalledWith(resetPasswordRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Invalid token');
    }));

    it('should verify token on initialization', fakeAsync(() => {
        const verifyTokenRequest: VerifyTokenRequest = {
            email: 'test@example.com',
            token: 'test-token'
        };

        activatedRouteSpy.queryParams = of({
            token: 'test-token',
            email: 'test@example.com'
        });

        authServiceSpy.verifyResetToken.and.returnValue(of({
            valid: true,
            message: 'Token is valid'
        }));

        component.ngOnInit();

        tick();

        expect(authServiceSpy.verifyResetToken).toHaveBeenCalledWith(verifyTokenRequest);
    }));

    it('should handle invalid token on initialization', fakeAsync(() => {
        const verifyTokenRequest: VerifyTokenRequest = {
            email: 'test@example.com',
            token: 'invalid-token'
        };

        activatedRouteSpy.queryParams = of({
            token: 'invalid-token',
            email: 'test@example.com'
        });

        authServiceSpy.verifyResetToken.and.returnValue(of({
            valid: false,
            message: 'Token is invalid or has expired'
        }));

        component.ngOnInit();

        tick();

        expect(authServiceSpy.verifyResetToken).toHaveBeenCalledWith(verifyTokenRequest);
        expect(component.tokenValid).toBe(false);
    }));

    it('should handle token verification error', fakeAsync(() => {
        activatedRouteSpy.queryParams = of({
            token: 'test-token',
            email: 'test@example.com'
        });

        authServiceSpy.verifyResetToken.and.returnValue(throwError({
            message: 'Network error'
        }));

        component.ngOnInit();

        tick();

        expect(component.tokenValid).toBe(false);
    }));

    it('should navigate to login on successful reset', fakeAsync(() => {
        const resetPasswordRequest: ResetPasswordRequest = {
            email: 'test@example.com',
            token: 'test-token',
            password: 'newpassword123',
            password_confirmation: 'newpassword123'
        };

        component.resetPasswordForm.setValue(resetPasswordRequest);
        authServiceSpy.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));

        component.onSubmit();

        tick();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('should correctly identify form field errors', () => {
        const emailControl = component.resetPasswordForm.get('email');
        const tokenControl = component.resetPasswordForm.get('token');
        const passwordControl = component.resetPasswordForm.get('password');
        const confirmationControl = component.resetPasswordForm.get('password_confirmation');

        // Test email field errors
        emailControl?.setValue('');
        emailControl?.markAsTouched();
        expect(component.hasError('email', 'required')).toBe(true);

        emailControl?.setValue('invalid');
        emailControl?.markAsTouched();
        expect(component.hasError('email', 'email')).toBe(true);

        // Test token field errors
        tokenControl?.setValue('');
        tokenControl?.markAsTouched();
        expect(component.hasError('token', 'required')).toBe(true);

        // Test password field errors
        passwordControl?.setValue('');
        passwordControl?.markAsTouched();
        expect(component.hasError('password', 'required')).toBe(true);

        passwordControl?.setValue('short');
        passwordControl?.markAsTouched();
        expect(component.hasError('password', 'minlength')).toBe(true);

        // Test password confirmation errors
        confirmationControl?.setValue('');
        confirmationControl?.markAsTouched();
        expect(component.hasError('password_confirmation', 'required')).toBe(true);

        passwordControl?.setValue('password123');
        confirmationControl?.setValue('different');
        confirmationControl?.markAsTouched();
        expect(component.hasError('password_confirmation', 'passwordMismatch')).toBe(true);

        // Test non-existent control
        expect(component.hasError('nonexistent', 'required')).toBe(false);
    });

    it('should mark all form controls as touched', () => {
        const emailControl = component.resetPasswordForm.get('email');
        const tokenControl = component.resetPasswordForm.get('token');
        const passwordControl = component.resetPasswordForm.get('password');
        const confirmationControl = component.resetPasswordForm.get('password_confirmation');

        spyOn(emailControl!, 'markAsTouched');
        spyOn(tokenControl!, 'markAsTouched');
        spyOn(passwordControl!, 'markAsTouched');
        spyOn(confirmationControl!, 'markAsTouched');

        (component as any).markFormGroupTouched(component.resetPasswordForm);

        expect(emailControl?.markAsTouched).toHaveBeenCalled();
        expect(tokenControl?.markAsTouched).toHaveBeenCalled();
        expect(passwordControl?.markAsTouched).toHaveBeenCalled();
        expect(confirmationControl?.markAsTouched).toHaveBeenCalled();
    });

    it('should handle nested form groups', () => {
        // Create a form group with nested controls
        const nestedGroup = formBuilder.group({
            parent: formBuilder.group({
                child: ['']
            }),
            sibling: ['']
        });

        spyOn(nestedGroup.get('parent')!, 'markAsTouched');
        spyOn(nestedGroup.get('sibling')!, 'markAsTouched');

        (component as any).markFormGroupTouched(nestedGroup);

        expect(nestedGroup.get('parent')?.markAsTouched).toHaveBeenCalled();
        expect(nestedGroup.get('sibling')?.markAsTouched).toHaveBeenCalled();
    });

    it('should reset submitting state after form reset', () => {
        component.isSubmitting = true;
        component.resetPasswordForm.reset();

        expect(component.isSubmitting).toBe(false);
    });

    it('should handle form submission with trimmed values', () => {
        const resetPasswordRequest: ResetPasswordRequest = {
            email: '  test@example.com  ',
            token: '  test-token  ',
            password: '  newpassword123  ',
            password_confirmation: '  newpassword123  '
        };

        component.resetPasswordForm.setValue(resetPasswordRequest);
        authServiceSpy.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));

        component.onSubmit();

        // Should submit with trimmed values
        expect(authServiceSpy.resetPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            token: 'test-token',
            password: 'newpassword123',
            password_confirmation: 'newpassword123'
        });
    });

    it('should disable form during submission', () => {
        component.isSubmitting = true;
        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        const inputs = form.querySelectorAll('input');
        inputs.forEach((input: HTMLInputElement) => {
            expect(input.disabled).toBe(true);
        });
    });

    it('should enable form after submission completes', fakeAsync(() => {
        const resetPasswordRequest: ResetPasswordRequest = {
            email: 'test@example.com',
            token: 'test-token',
            password: 'newpassword123',
            password_confirmation: 'newpassword123'
        };

        component.resetPasswordForm.setValue(resetPasswordRequest);
        authServiceSpy.resetPassword.and.returnValue(of({ message: 'Password reset successful' }));

        component.onSubmit();
        tick();

        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        const inputs = form.querySelectorAll('input');
        inputs.forEach((input: HTMLInputElement) => {
            expect(input.disabled).toBe(false);
        });
    }));

    it('should show error when token is invalid', () => {
        component.tokenValid = false;
        fixture.detectChanges();

        const errorMessage = fixture.nativeElement.querySelector('.error-message');
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.textContent).toContain('invalid or has expired');
    });

    it('should show form when token is valid', () => {
        component.tokenValid = true;
        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        expect(form).toBeTruthy();
    });

    it('should hide form when token is invalid', () => {
        component.tokenValid = false;
        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        expect(form).toBeFalsy();
    });

    it('should handle missing query parameters', () => {
        activatedRouteSpy.queryParams = of({});

        component.ngOnInit();

        expect(component.resetPasswordForm.get('token')?.value).toBe('');
        expect(component.resetPasswordForm.get('email')?.value).toBe('');
    });

    it('should handle partial query parameters', () => {
        activatedRouteSpy.queryParams = of({
            token: 'test-token'
            // Missing email
        });

        component.ngOnInit();

        expect(component.resetPasswordForm.get('token')?.value).toBe('test-token');
        expect(component.resetPasswordForm.get('email')?.value).toBe('');
    });
});