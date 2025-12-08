import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';

import { BillingService } from '../../services/billing.service';
// import { NotificationService } from '../../services/notification.service';
import { ISubscription } from '../../models/subscription.model';

/**
 * PastDueBannerComponent displays a banner for users with past due subscriptions.
 * Shows payment failure information, grace period remaining, and payment update options.
 * 
 * Features:
 * - Displays payment failed message
 * - Shows days remaining in grace period
 * - Urgent styling as grace period ends
 * - Update payment method button
 * - Dismiss option with session storage persistence
 * - Responsive design with accessibility support
 * - Smooth animations and transitions
 */
@Component({
    selector: 'app-past-due-banner',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './past-due-banner.component.html',
    styleUrls: ['./past-due-banner.component.css']
})
export class PastDueBannerComponent implements OnInit, OnDestroy {
    // Input properties
    @Input() subscription: ISubscription | null = null;
    @Input() showUpdateButton = true;
    @Input() autoHide = true;
    @Input() urgencyThreshold = 2; // Days remaining to show urgent styling

    // Output events
    @Output() onUpdatePayment = new EventEmitter<void>();
    @Output() onDismiss = new EventEmitter<void>();

    // Component state
    isVisible = true;
    isUrgent = false;
    isCritical = false;
    daysRemaining = 0;
    hoursRemaining = 0;
    minutesRemaining = 0;
    secondsRemaining = 0;

    // Countdown timer
    protected countdown$ = interval(1000);
    protected destroy$ = new Subject<void>();

    // Session storage key
    private readonly DISMISSAL_KEY = 'past_due_banner_dismissed';

    constructor(
        private billingService: BillingService,
        // private notificationService: NotificationService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.initializeBanner();
        this.startCountdown();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize banner state and check dismissal status
     */
    protected initializeBanner(): void {
        // Check if banner was previously dismissed
        const isDismissed = sessionStorage.getItem(this.DISMISSAL_KEY) === 'true';

        if (isDismissed) {
            this.isVisible = false;
            return;
        }

        // Update past due information
        this.updatePastDueInfo();

        // Auto-hide if not past due
        if (this.autoHide && (!this.subscription || !this.subscription.is_past_due)) {
            this.isVisible = false;
            return;
        }
    }

    /**
     * Start countdown timer for grace period expiration
     */
    protected startCountdown(): void {
        this.countdown$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.updatePastDueInfo();
                this.cdr.detectChanges();
            });
    }

    /**
     * Update past due information and calculate remaining time
     */
    protected updatePastDueInfo(): void {
        if (!this.subscription?.ends_at) {
            this.isVisible = false;
            return;
        }

        const graceEnd = new Date(this.subscription.ends_at);
        const now = new Date();
        const diff = graceEnd.getTime() - now.getTime();

        if (diff <= 0) {
            // Grace period has expired
            this.isVisible = false;
            return;
        }

        // Calculate time components
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        this.daysRemaining = days;
        this.hoursRemaining = hours;
        this.minutesRemaining = minutes;
        this.secondsRemaining = seconds;

        // Determine urgency levels
        this.isUrgent = days <= this.urgencyThreshold;
        this.isCritical = days === 0;
    }

    /**
     * Handle update payment button click
     */
    onUpdatePaymentClick(): void {
        this.onUpdatePayment.emit();

        // Navigate to billing settings if no custom handler
        this.router.navigate(['/billing']);
    }

    /**
     * Handle banner dismissal
     */
    onDismissClick(): void {
        this.isVisible = false;
        sessionStorage.setItem(this.DISMISSAL_KEY, 'true');
        this.onDismiss.emit();
    }

    /**
     * Get urgency level class for styling
     */
    getUrgencyClass(): string {
        if (this.isCritical) return 'past-due-critical';
        if (this.isUrgent) return 'past-due-urgent';
        return 'past-due-normal';
    }

    /**
     * Get formatted time remaining display
     */
    getTimeRemainingDisplay(): string {
        if (this.daysRemaining > 0) {
            return `${this.daysRemaining} day${this.daysRemaining !== 1 ? 's' : ''}`;
        }

        if (this.hoursRemaining > 0) {
            return `${this.hoursRemaining} hour${this.hoursRemaining !== 1 ? 's' : ''}`;
        }

        if (this.minutesRemaining > 0) {
            return `${this.minutesRemaining} minute${this.minutesRemaining !== 1 ? 's' : ''}`;
        }

        return `${this.secondsRemaining} second${this.secondsRemaining !== 1 ? 's' : ''}`;
    }

    /**
     * Get detailed time remaining for tooltip
     */
    getDetailedTimeRemaining(): string {
        const parts: string[] = [];

        if (this.daysRemaining > 0) {
            parts.push(`${this.daysRemaining}d`);
        }

        if (this.hoursRemaining > 0) {
            parts.push(`${this.hoursRemaining}h`);
        }

        if (this.minutesRemaining > 0) {
            parts.push(`${this.minutesRemaining}m`);
        }

        parts.push(`${this.secondsRemaining}s`);

        return parts.join(' ');
    }

    /**
     * Get urgency message based on time remaining
     */
    getUrgencyMessage(): string {
        if (this.isCritical) {
            return 'Your grace period expires today! Update your payment method immediately.';
        }

        if (this.daysRemaining === 1) {
            return 'Your grace period expires tomorrow! Update your payment method now.';
        }

        if (this.daysRemaining <= this.urgencyThreshold) {
            return `Your grace period expires in ${this.daysRemaining} day${this.daysRemaining !== 1 ? 's' : ''}!`;
        }

        return `${this.daysRemaining} day${this.daysRemaining !== 1 ? 's' : ''} remaining in grace period`;
    }

    /**
     * Get banner title based on urgency
     */
    getBannerTitle(): string {
        if (this.isCritical) {
            return '🚨 Payment Overdue - Action Required';
        }

        if (this.isUrgent) {
            return '⚠️ Payment Failed - Update Required';
        }

        return '💳 Payment Failed - Action Needed';
    }

    /**
     * Get payment status description
     */
    getPaymentStatusDescription(): string {
        if (this.isCritical) {
            return 'Your account access will be suspended soon.';
        }

        if (this.isUrgent) {
            return 'Your subscription will be canceled if payment is not updated.';
        }

        return 'Please update your payment method to continue service.';
    }

    /**
     * Check if banner should be visible
     */
    shouldShow(): boolean {
        return this.isVisible &&
            (this.subscription?.is_past_due === true) &&
            !!this.subscription.ends_at &&
            new Date(this.subscription.ends_at) > new Date();
    }

    /**
     * Reset dismissal state (for testing or admin use)
     */
    resetDismissal(): void {
        sessionStorage.removeItem(this.DISMISSAL_KEY);
        this.isVisible = true;
        this.updatePastDueInfo();
    }

    /**
     * Get action button text based on urgency
     */
    getActionButtonText(): string {
        if (this.isCritical) {
            return 'Update Payment Now';
        }

        if (this.isUrgent) {
            return 'Update Payment';
        }

        return 'Update Payment Method';
    }

    /**
     * Check if subscription is within grace period
     */
    isInGracePeriod(): boolean {
        return this.subscription?.is_within_grace_period === true;
    }

    /**
     * Get maximum value (wrapper for Math.max for template access)
     */
    max(a: number, b: number): number {
        console.log('DEBUG: Math.max called with', a, b);
        return Math.max(a, b);
    }

    /**
     * Calculate progress percentage for grace period
     */
    getGracePeriodProgress(): number {
        console.log('DEBUG: Calculating grace period progress with daysRemaining:', this.daysRemaining);
        const progress = this.daysRemaining ? this.max(10, (this.daysRemaining / 7) * 100) : 0;
        console.log('DEBUG: Calculated progress:', progress);
        return progress;
    }
}