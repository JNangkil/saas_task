import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SecurityService } from '../../../../services/security.service';
import { ToastService } from '../../../../services/toast.service';
import { PasswordChangeRequest } from '../../../../models/security.model';

@Component({
    selector: 'app-password-change',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './password-change.component.html',
    styleUrls: ['./password-change.component.scss']
})
export class PasswordChangeComponent {
    @Output() passwordChanged = new EventEmitter<void>();

    passwordForm: FormGroup;
    isSubmitting = false;
    showCurrentPassword = false;
    showNewPassword = false;
    showConfirmPassword = false;

    constructor(
        private fb: FormBuilder,
        private securityService: SecurityService,
        private toastService: ToastService
    ) {
        this.passwordForm = this.fb.group({
            current_password: ['', [Validators.required]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            password_confirmation: ['', [Validators.required]]
        }, { validators: this.passwordMatchValidator });
    }

    /**
     * Custom validator to check if passwords match
     */
    passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
        const password = form.get('password')?.value;
        const confirmPassword = form.get('password_confirmation')?.value;

        if (password && confirmPassword && password !== confirmPassword) {
            return { passwordMismatch: true };
        }

        return null;
    }

    /**
     * Toggle password visibility
     */
    togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
        switch (field) {
            case 'current':
                this.showCurrentPassword = !this.showCurrentPassword;
                break;
            case 'new':
                this.showNewPassword = !this.showNewPassword;
                break;
            case 'confirm':
                this.showConfirmPassword = !this.showConfirmPassword;
                break;
        }
    }

    /**
     * Handle form submission
     */
    onSubmit(): void {
        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;

        const changeRequest: PasswordChangeRequest = this.passwordForm.value;

        this.securityService.changePassword(changeRequest).subscribe({
            next: () => {
                this.toastService.success('Password changed successfully');
                this.passwordForm.reset();
                this.isSubmitting = false;
                this.passwordChanged.emit();
            },
            error: (error) => {
                const message = error.error?.message || 'Failed to change password';
                this.toastService.error(message);
                this.isSubmitting = false;
            }
        });
    }

    /**
     * Get form field error message
     */
    getErrorMessage(field: string): string {
        const formControl = this.passwordForm.get(field);

        if (!formControl || !formControl.errors || !formControl.touched) {
            return '';
        }

        const errors = formControl.errors;

        if (errors['required']) {
            return `${field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} is required`;
        }

        if (errors['minlength']) {
            return 'Password must be at least 8 characters long';
        }

        if (errors['passwordMismatch']) {
            return 'Passwords do not match';
        }

        return 'Invalid input';
    }

    /**
     * Check if form field has error
     */
    hasError(field: string): boolean {
        const formControl = this.passwordForm.get(field);
        return formControl ? formControl.invalid && formControl.touched : false;
    }

    /**
     * Get password strength indicator
     */
    getPasswordStrength(password: string): { strength: number; label: string; color: string } {
        if (!password) {
            return { strength: 0, label: 'Very Weak', color: 'danger' };
        }

        let strength = 0;

        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;

        // Complexity checks
        if (/[a-z]/.test(password)) strength++; // lowercase
        if (/[A-Z]/.test(password)) strength++; // uppercase
        if (/[0-9]/.test(password)) strength++; // numbers
        if (/[^a-zA-Z0-9]/.test(password)) strength++; // special characters

        const strengthMap = {
            0: { label: 'Very Weak', color: 'danger' },
            1: { label: 'Weak', color: 'danger' },
            2: { label: 'Fair', color: 'warning' },
            3: { label: 'Good', color: 'info' },
            4: { label: 'Strong', color: 'success' },
            5: { label: 'Very Strong', color: 'success' }
        };

        return {
            strength,
            ...strengthMap[Math.min(strength, 5) as keyof typeof strengthMap]
        };
    }
}