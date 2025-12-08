import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InvitationService } from '../../services/invitation.service';
import { TenantService } from '../../services/tenant.service';
import { IInvitationDetails, IAcceptInvitationRequest } from '../../interfaces/invitation.interface';

@Component({
    selector: 'app-accept-invitation',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
    templateUrl: './accept-invitation.component.html',
    styleUrls: ['./accept-invitation.component.css']
})
export class AcceptInvitationComponent implements OnInit, OnDestroy {
    // Component state
    isLoading = true;
    isSubmitting = false;
    isAuthenticated = false;
    invitation: IInvitationDetails | null = null;
    errorMessage: string | null = null;
    successMessage: string | null = null;

    // Forms
    loginForm: FormGroup;
    registerForm: FormGroup;

    // UI state
    currentView: 'loading' | 'invitation' | 'login' | 'register' | 'success' | 'error' = 'loading';
    redirectCountdown = 5;

    // Unsubscribe subject
    private destroy$ = new Subject<void>();
    private countdownInterval: any;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private invitationService: InvitationService,
        private tenantService: TenantService,
        private fb: FormBuilder
    ) {
        // Initialize forms
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });

        this.registerForm = this.fb.group({
            name: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });
    }

    ngOnInit(): void {
        // Get token from route parameters
        const token = this.route.snapshot.paramMap.get('token');

        if (!token) {
            this.showError('Invalid invitation link. No token provided.');
            return;
        }

        // Check if user is authenticated
        this.checkAuthenticationStatus();

        // Load invitation details
        this.loadInvitationDetails(token);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    // Check if user is authenticated
    private checkAuthenticationStatus(): void {
        this.tenantService.getTenants().pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                this.isAuthenticated = true;
            },
            error: () => {
                this.isAuthenticated = false;
            }
        });
    }

    // Load invitation details
    private loadInvitationDetails(token: string): void {
        this.invitationService.getInvitationByToken(token).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: (invitation) => {
                this.invitation = invitation;
                this.isLoading = false;

                // Check if invitation email matches logged-in user (if authenticated)
                if (this.isAuthenticated) {
                    this.currentView = 'invitation';
                } else {
                    this.currentView = 'login';
                }
            },
            error: (error) => {
                this.isLoading = false;
                this.showError(error.message || 'Failed to load invitation details. The invitation may be invalid or expired.');
            }
        });
    }

    // Password match validator
    private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
        const password = form.get('password');
        const confirmPassword = form.get('confirmPassword');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            return { passwordMismatch: true };
        }

        return null;
    }

    // Switch between login and register views
    switchToRegister(): void {
        this.currentView = 'register';
        // Pre-fill email if invitation exists
        if (this.invitation) {
            this.registerForm.patchValue({ email: this.invitation.invitation.email });
        }
    }

    switchToLogin(): void {
        this.currentView = 'login';
        // Pre-fill email if invitation exists
        if (this.invitation) {
            this.loginForm.patchValue({ email: this.invitation.invitation.email });
        }
    }

    // Handle login
    onLogin(): void {
        if (this.loginForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = null;

        // In a real implementation, this would call an AuthService
        // For now, we'll simulate a successful login
        setTimeout(() => {
            this.isAuthenticated = true;
            this.isSubmitting = false;
            this.currentView = 'invitation';
        }, 1000);
    }

    // Handle registration
    onRegister(): void {
        if (this.registerForm.invalid) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = null;

        const { name, email, password } = this.registerForm.value;

        // In a real implementation, this would call an AuthService
        // For now, we'll simulate a successful registration
        setTimeout(() => {
            this.isAuthenticated = true;
            this.isSubmitting = false;
            this.currentView = 'invitation';
        }, 1000);
    }

    // Accept invitation
    acceptInvitation(): void {
        if (!this.invitation) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = null;

        const token = this.invitation.invitation.token;
        const requestData: IAcceptInvitationRequest = {};

        // If user just registered, include their name
        if (this.registerForm.valid && this.registerForm.value.name) {
            requestData.name = this.registerForm.value.name;
        }

        this.invitationService.acceptInvitation(token, requestData).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.showSuccess('Invitation accepted successfully!');
            },
            error: (error) => {
                this.isSubmitting = false;
                this.showError(error.message || 'Failed to accept invitation. Please try again.');
            }
        });
    }

    // Decline invitation
    declineInvitation(): void {
        if (!this.invitation) {
            return;
        }

        this.isSubmitting = true;
        this.errorMessage = null;

        const token = this.invitation.invitation.token;

        this.invitationService.declineInvitation(token).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.showSuccess('Invitation declined successfully!');
            },
            error: (error) => {
                this.isSubmitting = false;
                this.showError(error.message || 'Failed to decline invitation. Please try again.');
            }
        });
    }

    // Show success message and start redirect countdown
    private showSuccess(message: string): void {
        this.successMessage = message;
        this.currentView = 'success';
        this.redirectCountdown = 5;

        this.countdownInterval = setInterval(() => {
            this.redirectCountdown--;

            if (this.redirectCountdown <= 0) {
                clearInterval(this.countdownInterval);
                this.redirectToWorkspace();
            }
        }, 1000);
    }

    // Show error message
    private showError(message: string): void {
        this.errorMessage = message;
        this.currentView = 'error';
        this.isLoading = false;
    }

    // Redirect to workspace
    private redirectToWorkspace(): void {
        if (this.invitation) {
            this.router.navigate(['/workspaces', this.invitation.workspace.id]);
        } else {
            this.router.navigate(['/workspaces']);
        }
    }

    // Manual redirect
    redirectToWorkspaceNow(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.redirectToWorkspace();
    }

    // Get role display text
    getRoleDisplayText(role: string): string {
        switch (role) {
            case 'admin':
                return 'Administrator';
            case 'member':
                return 'Member';
            case 'viewer':
                return 'Viewer';
            default:
                return role;
        }
    }

    // Get role description
    getRoleDescription(role: string): string {
        switch (role) {
            case 'admin':
                return 'Can manage all workspace settings, members, and content';
            case 'member':
                return 'Can create and edit content, but cannot manage settings or members';
            case 'viewer':
                return 'Can only view content, cannot make any changes';
            default:
                return '';
        }
    }

    // Get error message for login form
    getLoginErrorMessage(field: string): string {
        const control = this.loginForm.get(field);

        if (control?.errors?.['required']) {
            return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }

        if (field === 'email' && control?.errors?.['email']) {
            return 'Please enter a valid email address';
        }

        return '';
    }

    // Get error message for register form
    getRegisterErrorMessage(field: string): string {
        const control = this.registerForm.get(field);

        if (control?.errors?.['required']) {
            return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }

        if (field === 'email' && control?.errors?.['email']) {
            return 'Please enter a valid email address';
        }

        if (field === 'password' && control?.errors?.['minlength']) {
            return 'Password must be at least 8 characters long';
        }

        if (field === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
            return 'Passwords do not match';
        }

        return '';
    }
}