import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, ForgotPasswordRequest } from '../../../core/services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
    forgotPasswordForm: FormGroup;
    isSubmitting = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private toastService: ToastService
    ) {
        this.forgotPasswordForm = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    ngOnInit(): void {
        // Component initialization logic if needed
    }

    /**
     * Handle form submission
     */
    onSubmit(): void {
        if (this.forgotPasswordForm.invalid) {
            this.markFormGroupTouched(this.forgotPasswordForm);
            return;
        }

        this.isSubmitting = true;
        const forgotPasswordRequest: ForgotPasswordRequest = {
            email: this.forgotPasswordForm.value.email
        };

        this.authService.forgotPassword(forgotPasswordRequest).subscribe({
            next: (response) => {
                this.submitted = true;
                this.isSubmitting = false;
                this.toastService.success(
                    'Password reset instructions have been sent to your email address.'
                );
            },
            error: (error) => {
                this.isSubmitting = false;
                this.toastService.error(
                    error.message || 'Failed to send password reset email. Please try again.'
                );
            }
        });
    }

    /**
     * Navigate back to login page
     */
    goToLogin(): void {
        this.router.navigate(['/login']);
    }

    /**
     * Check if a form field has errors
     */
    hasError(controlName: string, errorName: string): boolean {
        const control = this.forgotPasswordForm.get(controlName);
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