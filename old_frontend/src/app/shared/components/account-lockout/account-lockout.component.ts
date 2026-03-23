import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LockoutInfo } from '../../../core/models/account-lockout.models';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-account-lockout',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './account-lockout.component.html',
    styleUrls: ['./account-lockout.component.css']
})
export class AccountLockoutComponent implements OnInit, OnDestroy {
    lockoutInfo: LockoutInfo | null = null;
    remainingTime: number = 0;
    countdownInterval: any = null;

    private destroy$ = new Subject<void>();

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.updateLockoutInfo();

        // Update lockout info every second for countdown
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);

        // Listen for lockout state changes
        this.authService.lockoutState$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.updateLockoutInfo();
            });
    }

    ngOnDestroy(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Update lockout information from AuthService
     */
    private updateLockoutInfo(): void {
        this.lockoutInfo = this.authService.getLockoutInfo();
        this.updateCountdown();
    }

    /**
     * Update the countdown timer
     */
    private updateCountdown(): void {
        if (this.lockoutInfo?.isLocked && this.lockoutInfo.lockedUntil) {
            const now = new Date();
            const lockedUntil = this.lockoutInfo.lockedUntil;
            const remainingMs = lockedUntil.getTime() - now.getTime();

            this.remainingTime = Math.max(0, Math.floor(remainingMs / 1000));

            // If lockout has expired, clear the lockout state
            if (this.remainingTime <= 0) {
                this.clearLockout();
            }
        } else {
            this.remainingTime = 0;
        }
    }

    /**
     * Clear the lockout state
     */
    private clearLockout(): void {
        // Force check lockout status which will clear expired lockouts
        this.authService.isAccountLocked();
        this.updateLockoutInfo();
    }

    /**
     * Navigate to forgot password page
     */
    goToForgotPassword(): void {
        this.router.navigate(['/forgot-password']);
    }

    /**
     * Format remaining time as human readable string
     */
    formatTimeRemaining(): string {
        if (this.remainingTime <= 0) {
            return 'now';
        }

        const minutes = Math.floor(this.remainingTime / 60);
        const seconds = this.remainingTime % 60;

        if (minutes > 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
        } else {
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Format the locked until date
     */
    formatLockedUntil(): string {
        if (!this.lockoutInfo?.lockedUntil) {
            return '';
        }

        return this.lockoutInfo.lockedUntil.toLocaleString();
    }

    /**
     * Get lockout message based on state
     */
    getLockoutMessage(): string {
        if (!this.lockoutInfo) {
            return '';
        }

        if (this.lockoutInfo.isLocked) {
            return this.lockoutInfo.message ||
                'Your account has been temporarily locked due to multiple failed login attempts.';
        }

        if (this.lockoutInfo.failedAttempts && this.lockoutInfo.remainingAttempts) {
            return `You have ${this.lockoutInfo.remainingAttempts} login attempt${this.lockoutInfo.remainingAttempts !== 1 ? 's' : ''} remaining before your account is locked.`;
        }

        return '';
    }
}