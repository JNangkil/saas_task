import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { MfaLoginRequest } from '../../../core/models/mfa.models';
import { ToastService } from '../../../services/toast.service';
import { AccountLockoutComponent } from '../../../shared/components/account-lockout/account-lockout.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, AccountLockoutComponent],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
    loginForm: FormGroup;
    isSubmitting = false;
    isAccountLocked = false;

    private destroy$ = new Subject<void>();

    constructor(
        private formBuilder: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private toastService: ToastService
    ) {
        this.loginForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        // If user is already authenticated, redirect to workspaces
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/workspaces']);
        }

        // If MFA is required, redirect to MFA verification
        if (this.authService.isMfaRequired()) {
            this.router.navigate(['/mfa-verify']);
        }

        // Check if account is locked
        this.checkAccountLockStatus();

        // Listen for lockout state changes
        this.authService.lockoutState$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.checkAccountLockStatus();
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Check if account is currently locked
     */
    private checkAccountLockStatus(): void {
        this.isAccountLocked = this.authService.isAccountLocked();

        // Disable form if account is locked
        if (this.isAccountLocked) {
            this.loginForm.disable();
        } else {
            this.loginForm.enable();
        }
    }

    /**
     * Handle form submission
     */
    onSubmit(): void {
        if (this.loginForm.invalid) {
            this.markFormGroupTouched(this.loginForm);
            return;
        }

        // Prevent submission if account is locked
        if (this.isAccountLocked) {
            this.toastService.warning('Your account is currently locked. Please wait before trying again.');
            return;
        }

        this.isSubmitting = true;
        const loginRequest: MfaLoginRequest = {
            email: this.loginForm.value.email,
            password: this.loginForm.value.password
        };

        this.authService.loginWithMfa(loginRequest).subscribe({
            next: (response) => {
                this.isSubmitting = false;

                if (response.requires_mfa) {
                    // MFA is required, redirect to MFA verification
                    this.toastService.info('Please enter your verification code to complete login.');
                    this.router.navigate(['/mfa-verify']);
                } else {
                    // MFA is not required, login is complete
                    this.toastService.success('Login successful!');
                    this.router.navigate(['/workspaces']);
                }
            },
            error: (error) => {
                this.isSubmitting = false;

                // Handle different error types
                if (error.status === 423) {
                    // Account locked - show specific message
                    this.toastService.error('Your account has been temporarily locked due to multiple failed login attempts.');
                } else if (error.status === 401 && error.error?.remaining_attempts !== undefined) {
                    // Invalid credentials with attempt information
                    const remainingAttempts = error.error.remaining_attempts;
                    this.toastService.error(
                        `Invalid credentials. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
                    );
                } else {
                    // Generic error
                    this.toastService.error(
                        error.error?.message || error.message || 'Login failed. Please check your credentials and try again.'
                    );
                }
            }
        });
    }

    /**
     * Navigate to forgot password page
     */
    goToForgotPassword(): void {
        this.router.navigate(['/forgot-password']);
    }

    /**
     * Check if a form field has errors
     */
    hasError(controlName: string, errorName: string): boolean {
        const control = this.loginForm.get(controlName);
        return control ? control.hasError(errorName) && (control.dirty || control.touched) : false;
    }

    /**
     * Mark all form controls as touched
     */
    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.values(formGroup.controls).forEach(control => {
            control.markAsTouched();
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    }
}