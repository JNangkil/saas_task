import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService, ResetPasswordRequest, VerifyTokenRequest } from '../../../core/services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
    resetPasswordForm: FormGroup;
    isSubmitting = false;
    submitted = false;
    tokenValid = false;
    tokenVerificationInProgress = true;
    email = '';
    token = '';

    private routeSub: Subscription;

    constructor(
        private formBuilder: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService
    ) {
        this.routeSub = new Subscription();
        this.resetPasswordForm = this.formBuilder.group({
            password: ['', [
                Validators.required,
                Validators.minLength(8),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            ]],
            password_confirmation: ['', Validators.required]
        }, {
            validators: this.passwordMatchValidator
        });
    }

    ngOnInit(): void {
        this.routeSub = this.route.queryParams.subscribe(params => {
            this.email = params['email'] || '';
            this.token = params['token'] || '';

            if (!this.email || !this.token) {
                this.toastService.error('Invalid reset link. Please request a new password reset.');
                this.router.navigate(['/forgot-password']);
                return;
            }

            this.verifyResetToken();
        });
    }

    ngOnDestroy(): void {
        this.routeSub.unsubscribe();
    }

    /**
     * Verify if the reset token is valid
     */
    private verifyResetToken(): void {
        const request: VerifyTokenRequest = {
            email: this.email,
            token: this.token
        };

        this.authService.verifyResetToken(request).subscribe({
            next: (response) => {
                this.tokenVerificationInProgress = false;
                if (response.valid) {
                    this.tokenValid = true;
                } else {
                    this.tokenValid = false;
                    this.toastService.error(response.message || 'Invalid or expired reset token.');
                }
            },
            error: (error) => {
                this.tokenVerificationInProgress = false;
                this.tokenValid = false;
                this.toastService.error(
                    error.message || 'Failed to verify reset token. Please try again or request a new password reset.'
                );
            }
        });
    }

    /**
     * Handle form submission
     */
    onSubmit(): void {
        if (this.resetPasswordForm.invalid) {
            this.markFormGroupTouched(this.resetPasswordForm);
            return;
        }

        this.isSubmitting = true;
        const resetPasswordRequest: ResetPasswordRequest = {
            email: this.email,
            token: this.token,
            password: this.resetPasswordForm.value.password,
            password_confirmation: this.resetPasswordForm.value.password_confirmation
        };

        this.authService.resetPassword(resetPasswordRequest).subscribe({
            next: (response) => {
                this.submitted = true;
                this.isSubmitting = false;
                this.toastService.success(
                    'Your password has been reset successfully. You can now login with your new password.'
                );
            },
            error: (error) => {
                this.isSubmitting = false;
                this.toastService.error(
                    error.message || 'Failed to reset password. Please try again or request a new password reset.'
                );
            }
        });
    }

    /**
     * Navigate to login page
     */
    goToLogin(): void {
        this.router.navigate(['/login']);
    }

    /**
     * Navigate to forgot password page
     */
    requestNewReset(): void {
        this.router.navigate(['/forgot-password']);
    }

    /**
     * Check if a form field has errors
     */
    hasError(controlName: string, errorName: string): boolean {
        const control = this.resetPasswordForm.get(controlName);
        return control ? control.hasError(errorName) && (control.dirty || control.touched) : false;
    }

    /**
     * Check if password meets strength requirements
     */
    getPasswordStrengthMessage(): string {
        const password = this.resetPasswordForm.get('password')?.value;
        if (!password) return '';

        const errors = [];

        if (password.length < 8) {
            errors.push('at least 8 characters');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('one lowercase letter');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('one uppercase letter');
        }

        if (!/\d/.test(password)) {
            errors.push('one number');
        }

        if (!/[@$!%*?&]/.test(password)) {
            errors.push('one special character (@$!%*?&)');
        }

        if (errors.length > 0) {
            return `Password must contain ${errors.join(', ')}`;
        }

        return '';
    }

    /**
     * Password match validator
     */
    private passwordMatchValidator(formGroup: FormGroup): { [key: string]: boolean } | null {
        const password = formGroup.get('password')?.value;
        const confirmPassword = formGroup.get('password_confirmation')?.value;

        return password && confirmPassword && password !== confirmPassword
            ? { passwordMismatch: true }
            : null;
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