import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
    registerForm: FormGroup;
    isSubmitting = false;
    showPassword = false;
    showConfirmPassword = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private toastService: ToastService
    ) {
        this.registerForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', [Validators.required]],
            agreeToTerms: [false, [Validators.requiredTrue]]
        }, { validators: this.passwordMatchValidator });
    }

    ngOnInit(): void {
        // If already authenticated, redirect to workspaces
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/workspaces']);
        }
    }

    passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
        const password = control.get('password');
        const confirmPassword = control.get('confirmPassword');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            return { passwordMismatch: true };
        }
        return null;
    }

    onSubmit(): void {
        if (this.registerForm.invalid) {
            this.markFormGroupTouched(this.registerForm);
            return;
        }

        this.isSubmitting = true;

        const { name, email, password, confirmPassword } = this.registerForm.value;

        this.authService.register({
            name,
            email,
            password,
            password_confirmation: confirmPassword
        }).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.toastService.success('Account created successfully! Please log in.');
                this.router.navigate(['/login']);
            },
            error: (error: any) => {
                this.isSubmitting = false;
                if (error.error?.errors) {
                    // Handle validation errors from backend
                    const errors = error.error.errors;
                    if (errors.email) {
                        this.toastService.error(errors.email[0]);
                    } else if (errors.password) {
                        this.toastService.error(errors.password[0]);
                    } else {
                        this.toastService.error('Registration failed. Please try again.');
                    }
                } else {
                    this.toastService.error(error.error?.message || 'Registration failed. Please try again.');
                }
            }
        });
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPasswordVisibility(): void {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    hasError(controlName: string, errorName: string): boolean {
        const control = this.registerForm.get(controlName);
        return control ? control.hasError(errorName) && (control.dirty || control.touched) : false;
    }

    get hasPasswordMismatch(): boolean {
        return this.registerForm.hasError('passwordMismatch') &&
            this.registerForm.get('confirmPassword')?.touched === true;
    }

    private markFormGroupTouched(formGroup: FormGroup): void {
        Object.values(formGroup.controls).forEach(control => {
            control.markAsTouched();
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            }
        });
    }

    get isFreeMode(): boolean {
        return environment.freeMode;
    }
}
