import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { AuthService } from '../../../core/services/auth.service';
import { MfaSetupRequest, MfaSetupResponse, MfaEnableRequest } from '../../../core/models/mfa.models';

@Component({
    selector: 'app-mfa-setup',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QRCodeComponent],
    templateUrl: './mfa-setup.component.html',
    styleUrls: ['./mfa-setup.component.css']
})
export class MfaSetupComponent implements OnInit {
    setupForm: FormGroup;
    verifyForm: FormGroup;
    qrCodeUrl: string | null = null;
    secret: string | null = null;
    recoveryCodes: string[] = [];
    showVerificationStep = false;
    isLoading = false;
    errorMessage: string | null = null;
    successMessage: string | null = null;
    showRecoveryCodes = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.setupForm = this.fb.group({
            password: ['', [Validators.required]]
        });

        this.verifyForm = this.fb.group({
            code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
        });
    }

    ngOnInit(): void {
        // Check if user is already authenticated
        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login']);
            return;
        }
    }

    startMfaSetup(): void {
        if (this.setupForm.invalid) {
            this.errorMessage = 'Please enter your password to continue.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = null;

        const request: MfaSetupRequest = {
            password: this.setupForm.get('password')?.value
        };

        this.authService.setupMfa(request).subscribe({
            next: (response: MfaSetupResponse) => {
                this.qrCodeUrl = response.qr_code_url;
                this.secret = response.secret;
                this.recoveryCodes = response.recovery_codes;
                this.showVerificationStep = true;
                this.isLoading = false;
                this.successMessage = 'MFA setup initiated. Please scan the QR code with your authenticator app.';
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Failed to initiate MFA setup. Please check your password and try again.';
            }
        });
    }

    verifyAndEnableMfa(): void {
        if (this.verifyForm.invalid) {
            this.errorMessage = 'Please enter a valid 6-digit verification code.';
            return;
        }

        this.isLoading = true;
        this.errorMessage = null;

        const request: MfaEnableRequest = {
            code: this.verifyForm.get('code')?.value
        };

        this.authService.enableMfa(request).subscribe({
            next: (response) => {
                this.isLoading = false;
                this.successMessage = response.message || 'MFA has been successfully enabled for your account.';

                // Redirect to profile or dashboard after a short delay
                setTimeout(() => {
                    this.router.navigate(['/profile']);
                }, 2000);
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.message || 'Invalid verification code. Please try again.';
            }
        });
    }

    toggleRecoveryCodes(): void {
        this.showRecoveryCodes = !this.showRecoveryCodes;
    }

    copyRecoveryCodes(): void {
        const codesText = this.recoveryCodes.join('\n');
        navigator.clipboard.writeText(codesText).then(() => {
            this.successMessage = 'Recovery codes copied to clipboard!';
            setTimeout(() => {
                this.successMessage = null;
            }, 3000);
        }).catch(() => {
            this.errorMessage = 'Failed to copy recovery codes. Please copy them manually.';
        });
    }

    copyToClipboard(text: string): void {
        navigator.clipboard.writeText(text).then(() => {
            this.successMessage = 'Secret copied to clipboard!';
            setTimeout(() => {
                this.successMessage = null;
            }, 3000);
        }).catch(() => {
            this.errorMessage = 'Failed to copy secret. Please copy it manually.';
        });
    }

    goBack(): void {
        if (this.showVerificationStep) {
            this.showVerificationStep = false;
            this.qrCodeUrl = null;
            this.secret = null;
            this.recoveryCodes = [];
            this.verifyForm.reset();
        } else {
            this.router.navigate(['/profile']);
        }
    }
}