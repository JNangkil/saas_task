import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MfaVerifyRequest } from '../../../core/models/mfa.models';
import { AccountLockoutComponent } from '../../../shared/components/account-lockout/account-lockout.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-mfa-verify',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, AccountLockoutComponent],
    templateUrl: './mfa-verify.component.html',
    styleUrls: ['./mfa-verify.component.css']
})
export class MfaVerifyComponent implements OnInit, OnDestroy {
    verifyForm: FormGroup;
    useRecoveryCode = false;
    isLoading = false;
    errorMessage: string | null = null;
    userEmail: string | null = null;
    isAccountLocked = false;

    private destroy$ = new Subject<void>();

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.verifyForm = this.fb.group({
            code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
            recoveryCode: ['']
        });
    }

    ngOnInit(): void {
        // Check if MFA is required
        if (!this.authService.isMfaRequired()) {
            this.router.navigate(['/login']);
            return;
        }

        // Get the email from MFA state
        const mfaState = this.authService.getMfaState();
        this.userEmail = mfaState.email || null;

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
            this.verifyForm.disable();
        } else {
            this.verifyForm.enable();
        }
    }

    toggleInputType(): void {
        this.useRecoveryCode = !this.useRecoveryCode;
        this.errorMessage = null;

        if (this.useRecoveryCode) {
            this.verifyForm.get('code')?.clearValidators();
            this.verifyForm.get('recoveryCode')?.setValidators([Validators.required]);
        } else {
            this.verifyForm.get('code')?.setValidators([Validators.required, Validators.pattern('^[0-9]{6}$')]);
            this.verifyForm.get('recoveryCode')?.clearValidators();
        }

        this.verifyForm.get('code')?.updateValueAndValidity();
        this.verifyForm.get('recoveryCode')?.updateValueAndValidity();
    }

    verifyMfa(): void {
        if (this.verifyForm.invalid) {
            this.errorMessage = this.useRecoveryCode
                ? 'Please enter a valid recovery code.'
                : 'Please enter a valid 6-digit verification code.';
            return;
        }

        // Prevent submission if account is locked
        if (this.isAccountLocked) {
            this.errorMessage = 'Your account is currently locked. Please wait before trying again.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = null;

        const request: MfaVerifyRequest = {
            email: this.userEmail || '',
            password: '', // This will be handled by the backend using the MFA token
        };

        if (this.useRecoveryCode) {
            request.recovery_code = this.verifyForm.get('recoveryCode')?.value;
        } else {
            request.code = this.verifyForm.get('code')?.value;
        }

        this.authService.verifyMfaCode(request).subscribe({
            next: () => {
                this.isLoading = false;
                // Redirect to dashboard or intended page
                this.router.navigate(['/dashboard']);
            },
            error: (error) => {
                this.isLoading = false;

                // Handle different error types
                if (error.status === 423) {
                    // Account locked
                    this.errorMessage = 'Your account has been temporarily locked due to multiple failed verification attempts.';
                } else {
                    // Invalid code or other error
                    this.errorMessage = error.error?.message ||
                        (this.useRecoveryCode
                            ? 'Invalid recovery code. Please try again.'
                            : 'Invalid verification code. Please try again.');
                }
            }
        });
    }

    cancel(): void {
        this.authService.clearMfaState();
        this.router.navigate(['/login']);
    }
}