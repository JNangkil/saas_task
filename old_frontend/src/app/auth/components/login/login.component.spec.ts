import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { MfaLoginRequest } from '../../../core/models/mfa.models';
import { ToastService } from '../../../services/toast.service';
import { AccountLockoutComponent } from '../../../shared/components/account-lockout/account-lockout.component';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let formBuilder: FormBuilder;

    const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
    };

    const mockLoginResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: mockUser
    };

    const mockMfaLoginResponse = {
        requires_mfa: true,
        mfa_token: 'mock-mfa-token',
        message: 'MFA required'
    };

    beforeEach(async () => {
        const authSpy = jasmine.createSpyObj('AuthService', [
            'isAuthenticated',
            'isMfaRequired',
            'isAccountLocked',
            'loginWithMfa',
            'lockoutState$',
            'getLockoutInfo'
        ]);

        const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
        const toastSpyObj = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning', 'info']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule, AccountLockoutComponent],
            declarations: [LoginComponent],
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: authSpy },
                { provide: Router, useValue: routerSpyObj },
                { provide: ToastService, useValue: toastSpyObj }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
        formBuilder = TestBed.inject(FormBuilder);

        // Set up default spy behaviors
        authServiceSpy.isAuthenticated.and.returnValue(false);
        authServiceSpy.isMfaRequired.and.returnValue(false);
        authServiceSpy.isAccountLocked.and.returnValue(false);
        authServiceSpy.lockoutState$ = of({ isLocked: false });
    });

    beforeEach(() => {
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize login form with email and password fields', () => {
        expect(component.loginForm).toBeDefined();
        expect(component.loginForm.get('email')).toBeDefined();
        expect(component.loginForm.get('password')).toBeDefined();
    });

    it('should have required validators on email field', () => {
        const emailControl = component.loginForm.get('email');
        emailControl?.setValue('');
        expect(emailControl?.invalid).toBeTruthy();
        expect(emailControl?.errors?.['required']).toBeTruthy();

        emailControl?.setValue('invalid-email');
        expect(emailControl?.invalid).toBeTruthy();
        expect(emailControl?.errors?.['email']).toBeTruthy();

        emailControl?.setValue('valid@example.com');
        expect(emailControl?.valid).toBeTruthy();
    });

    it('should have required validator on password field', () => {
        const passwordControl = component.loginForm.get('password');
        passwordControl?.setValue('');
        expect(passwordControl?.invalid).toBeTruthy();
        expect(passwordControl?.errors?.['required']).toBeTruthy();

        passwordControl?.setValue('password');
        expect(passwordControl?.valid).toBeTruthy();
    });

    it('should redirect to workspaces if already authenticated', () => {
        authServiceSpy.isAuthenticated.and.returnValue(true);

        component.ngOnInit();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspaces']);
    });

    it('should redirect to MFA verification if MFA is required', () => {
        authServiceSpy.isAuthenticated.and.returnValue(false);
        authServiceSpy.isMfaRequired.and.returnValue(true);

        component.ngOnInit();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/mfa-verify']);
    });

    it('should check account lock status on initialization', () => {
        authServiceSpy.isAuthenticated.and.returnValue(false);
        authServiceSpy.isMfaRequired.and.returnValue(false);
        authServiceSpy.isAccountLocked.and.returnValue(true);

        component.ngOnInit();

        expect(component.isAccountLocked).toBe(true);
        expect(component.loginForm.disabled).toBe(true);
    });

    it('should disable form when account is locked', () => {
        authServiceSpy.isAccountLocked.and.returnValue(true);

        (component as any).checkAccountLockStatus();

        expect(component.isAccountLocked).toBe(true);
        expect(component.loginForm.disabled).toBe(true);
    });

    it('should enable form when account is not locked', () => {
        authServiceSpy.isAccountLocked.and.returnValue(false);

        (component as any).checkAccountLockStatus();

        expect(component.isAccountLocked).toBe(false);
        expect(component.loginForm.disabled).toBe(false);
    });

    it('should not submit form if invalid', () => {
        spyOn(component as any, 'markFormGroupTouched');
        component.loginForm.setValue({ email: '', password: '' });

        component.onSubmit();

        expect((component as any).markFormGroupTouched).toHaveBeenCalledWith(component.loginForm);
        expect(component.isSubmitting).toBe(false);
    });

    it('should not submit if account is locked', () => {
        component.isAccountLocked = true;
        component.loginForm.setValue({
            email: 'test@example.com',
            password: 'password'
        });

        component.onSubmit();

        expect(toastServiceSpy.warning).toHaveBeenCalledWith(
            'Your account is currently locked. Please wait before trying again.'
        );
        expect(component.isSubmitting).toBe(false);
        expect(authServiceSpy.loginWithMfa).not.toHaveBeenCalled();
    });

    it('should handle successful login without MFA', fakeAsync(() => {
        const loginRequest: MfaLoginRequest = {
            email: 'test@example.com',
            password: 'password'
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(of(mockMfaLoginResponse));

        component.onSubmit();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.loginWithMfa).toHaveBeenCalledWith(loginRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.success).toHaveBeenCalledWith('Login successful!');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/workspaces']);
    }));

    it('should handle successful login with MFA required', fakeAsync(() => {
        const loginRequest: MfaLoginRequest = {
            email: 'test@example.com',
            password: 'password'
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(of(mockMfaLoginResponse));

        component.onSubmit();

        expect(component.isSubmitting).toBe(true);
        expect(authServiceSpy.loginWithMfa).toHaveBeenCalledWith(loginRequest);

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.info).toHaveBeenCalledWith(
            'Please enter your verification code to complete login.'
        );
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/mfa-verify']);
    }));

    it('should handle account locked error', fakeAsync(() => {
        const loginRequest: MfaLoginRequest = {
            email: 'test@example.com',
            password: 'password'
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(throwError({
            status: 423,
            error: {
                error: 'Account locked',
                message: 'Your account has been temporarily locked'
            }
        }));

        component.onSubmit();

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith(
            'Your account has been temporarily locked due to multiple failed login attempts.'
        );
    }));

    it('should handle invalid credentials with remaining attempts', fakeAsync(() => {
        const loginRequest: MfaLoginRequest = {
            email: 'test@example.com',
            password: 'wrongpassword'
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(throwError({
            status: 401,
            error: {
                error: 'Invalid credentials',
                remaining_attempts: 3
            }
        }));

        component.onSubmit();

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith(
            'Invalid credentials. 3 attempts remaining.'
        );
    }));

    it('should handle generic login error', fakeAsync(() => {
        const loginRequest: MfaLoginRequest = {
            email: 'test@example.com',
            password: 'password'
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(throwError({
            status: 500,
            error: {
                message: 'Server error'
            }
        }));

        component.onSubmit();

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith('Server error');
    }));

    it('should handle single remaining attempt correctly', fakeAsync(() => {
        const loginRequest: MfaLoginRequest = {
            email: 'test@example.com',
            password: 'wrongpassword'
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(throwError({
            status: 401,
            error: {
                error: 'Invalid credentials',
                remaining_attempts: 1
            }
        }));

        component.onSubmit();

        tick();

        expect(component.isSubmitting).toBe(false);
        expect(toastServiceSpy.error).toHaveBeenCalledWith(
            'Invalid credentials. 1 attempt remaining.'
        );
    }));

    it('should navigate to forgot password page', () => {
        component.goToForgotPassword();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/forgot-password']);
    });

    it('should correctly identify form field errors', () => {
        const emailControl = component.loginForm.get('email');
        const passwordControl = component.loginForm.get('password');

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

        // Test password field errors
        passwordControl?.setValue('');
        passwordControl?.markAsTouched();
        expect(component.hasError('password', 'required')).toBe(true);

        passwordControl?.setValue('password');
        expect(component.hasError('password', 'required')).toBe(false);

        // Test non-existent control
        expect(component.hasError('nonexistent', 'required')).toBe(false);
    });

    it('should mark all form controls as touched', () => {
        const emailControl = component.loginForm.get('email');
        const passwordControl = component.loginForm.get('password');

        spyOn(emailControl!, 'markAsTouched');
        spyOn(passwordControl!, 'markAsTouched');

        (component as any).markFormGroupTouched(component.loginForm);

        expect(emailControl?.markAsTouched).toHaveBeenCalled();
        expect(passwordControl?.markAsTouched).toHaveBeenCalled();
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
        component.loginForm.reset();

        expect(component.isSubmitting).toBe(false);
    });

    it('should handle form submission with valid data', () => {
        const loginRequest: MfaLoginRequest = {
            email: 'test@example.com',
            password: 'password'
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(of(mockMfaLoginResponse));

        component.onSubmit();

        expect(authServiceSpy.loginWithMfa).toHaveBeenCalledWith(loginRequest);
    });

    it('should handle form submission with trimmed values', () => {
        const loginRequest: MfaLoginRequest = {
            email: '  test@example.com  ',
            password: '  password  '
        };

        component.loginForm.setValue(loginRequest);
        authServiceSpy.loginWithMfa.and.returnValue(of(mockMfaLoginResponse));

        component.onSubmit();

        // Should submit with trimmed values
        expect(authServiceSpy.loginWithMfa).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password'
        });
    });

    it('should clean up subscriptions on destroy', () => {
        spyOn(component['destroy$'], 'next');
        spyOn(component['destroy$'], 'complete');

        component.ngOnDestroy();

        expect(component['destroy$'].next).toHaveBeenCalled();
        expect(component['destroy$'].complete).toHaveBeenCalled();
    });
});