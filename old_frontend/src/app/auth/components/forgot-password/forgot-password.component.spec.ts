import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService, ForgotPasswordRequest } from '../../../core/services/auth.service';
import { ToastService } from '../../../services/toast.service';

describe('ForgotPasswordComponent', () => {
    let component: ForgotPasswordComponent;
    let fixture: ComponentFixture<ForgotPasswordComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let formBuilder: FormBuilder;

    beforeEach(async () => {
        const authSpy = jasmine.createSpyObj('AuthService', ['forgotPassword']);
        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const toastSpyObj = jasmine.createSpyObj('ToastService', ['success', 'error']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule],
            declarations: [ForgotPasswordComponent],
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: authSpy },
                { provide: Router, useValue: routerSpyObj },
                { provide: ToastService, useValue: toastSpyObj }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ForgotPasswordComponent);
        component = fixture.componentInstance;
        authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        formBuilder = TestBed.inject(FormBuilder);
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize forgot password form with email field', () => {
        expect(component.forgotPasswordForm).toBeDefined();
        expect(component.forgotPasswordForm.get('email')).toBeDefined();
    });

    it('should have required and email validators on email field', () => {
        const emailControl = component.forgotPasswordForm.get('email');

        // Test required validator
        emailControl?.setValue('');
        expect(emailControl?.invalid).toBeTruthy();
        expect(emailControl?.errors?.['required']).toBeTruthy();

        // Test email validator
        emailControl?.setValue('invalid-email');
        expect(emailControl?.invalid).toBeTruthy();
        expect(emailControl?.errors?.['email']).toBeTruthy();

        // Test valid email
        emailControl?.setValue('valid@example.com');
        expect(emailControl?.valid).toBeTruthy();
    });

    it('should not submit form if invalid', () => {
        spyOn(component as any, 'markFormGroupTouched');
        component.forgotPasswordForm.setValue({ email: '' });

        component.onSubmit();

        expect((component as any).markFormGroupTouched).toHaveBeenCalledWith(component.forgotPasswordForm);
        expect(component.isSubmitting).toBe(false);
    });

    it('should submit form with valid email', fakeAsync(() => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: 'test@example.com'
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(of({ message: 'Password reset link sent' }));

        component.onSubmit();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith(forgotPasswordRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(component.submitted).toBe(true);
        expect(toastServiceSpy.success).toHaveBeenCalledWith(
            'Password reset instructions have been sent to your email address.'
        );
    }));

    it('should handle submission error', fakeAsync(() => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: 'test@example.com'
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(throwError({
            message: 'Failed to send email'
        }));

        component.onSubmit();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith(forgotPasswordRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to send password reset email. Please try again.');
    }));

    it('should navigate to login page', () => {
        component.goToLogin();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should correctly identify form field errors', () => {
        const emailControl = component.forgotPasswordForm.get('email');

        // Test email field errors
        emailControl?.setValue('');
        emailControl?.markAsTouched();
        expect(component.hasError('email', 'required')).toBe(true);

        emailControl?.setValue('invalid');
        emailControl?.markAsTouched();
        expect(component.hasError('email', 'email')).toBe(true);

        emailControl?.setValue('valid@example.com');
        expect(component.hasError('email', 'required')).toBe(false);
        expect(component.hasError('email', 'email')).toBe(false);

        // Test non-existent control
        expect(component.hasError('nonexistent', 'required')).toBe(false);
    });

    it('should mark all form controls as touched', () => {
        const emailControl = component.forgotPasswordForm.get('email');

        spyOn(emailControl!, 'markAsTouched');

        (component as any).markFormGroupTouched(component.forgotPasswordForm);

        expect(emailControl?.markAsTouched).toHaveBeenCalled();
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
        component.forgotPasswordForm.reset();

        expect(component.isSubmitting).toBe(false);
    });

    it('should handle form submission with trimmed email', () => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: '  test@example.com  '
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(of({ message: 'Password reset link sent' }));

        component.onSubmit();

        // Should submit with trimmed email
        expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith({
            email: 'test@example.com'
        });
    });

    it('should handle form submission with uppercase email', () => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: 'TEST@EXAMPLE.COM'
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(of({ message: 'Password reset link sent' }));

        component.onSubmit();

        // Should submit with email as-is (case sensitivity depends on backend)
        expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith(forgotPasswordRequest);
    });

    it('should disable form during submission', () => {
        component.isSubmitting = true;
        fixture.detectChanges();

        const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
        expect(emailInput.disabled).toBe(true);
    });

    it('should enable form after submission completes', fakeAsync(() => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: 'test@example.com'
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(of({ message: 'Password reset link sent' }));

        component.onSubmit();
        tick();

        fixture.detectChanges();

        const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
        expect(emailInput.disabled).toBe(false);
    }));

    it('should show success message after submission', () => {
        component.submitted = true;
        fixture.detectChanges();

        const successMessage = fixture.nativeElement.querySelector('.success-message');
        expect(successMessage).toBeTruthy();
        expect(successMessage.textContent).toContain('Password reset instructions have been sent');
    });

    it('should hide form after successful submission', () => {
        component.submitted = true;
        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        expect(form).toBeFalsy();
    });

    it('should show form when not submitted', () => {
        component.submitted = false;
        fixture.detectChanges();

        const form = fixture.nativeElement.querySelector('form');
        expect(form).toBeTruthy();
    });

    it('should handle network error', fakeAsync(() => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: 'test@example.com'
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(throwError({ status: 0 }));

        component.onSubmit();

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to send password reset email. Please try again.');
    }));

    it('should handle timeout error', fakeAsync(() => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: 'test@example.com'
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(throwError({ status: 408 }));

        component.onSubmit();

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Failed to send password reset email. Please try again.');
    }));

    it('should handle server error response', fakeAsync(() => {
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: 'test@example.com'
        };

        component.forgotPasswordForm.setValue(forgotPasswordRequest);
        authServiceSpy.forgotPassword.and.returnValue(throwError({
            status: 500,
            error: { message: 'Internal server error' }
        }));

        component.onSubmit();

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Internal server error');
    }));
});