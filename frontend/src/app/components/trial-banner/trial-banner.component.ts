import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs';

import { BillingService } from '../../services/billing.service';
// import { NotificationService } from '../../services/notification.service';
import { ISubscription } from '../../models/subscription.model';

/**
 * TrialBannerComponent displays a banner for users on trial subscriptions.
 * Shows remaining trial days, urgency indicators, and upgrade options.
 * 
 * Features:
 * - Displays trial period remaining with countdown
 * - Urgency styling as trial expires
 * - Upgrade button to convert to paid plan
 * - Dismiss option with session storage persistence
 * - Responsive design with accessibility support
 * - Smooth animations and transitions
 */
@Component({
    selector: 'app-trial-banner',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './trial-banner.component.html',
    styleUrls: ['./trial-banner.component.css']
})
export class TrialBannerComponent implements OnInit, OnDestroy {
    // Input properties
    @Input() subscription: ISubscription | null = null;
    @Input() showUpgradeButton = true;
    @Input() autoHide = true;
    @Input() urgencyThreshold = 3; // Days remaining to show urgent styling

    // Output events
    @Output() onUpgrade = new EventEmitter<void>();
    @Output() onDismiss = new EventEmitter<void>();

    // Component state
    isVisible = true;
    isUrgent = false;
    daysRemaining = 0;
    hoursRemaining = 0;
    minutesRemaining = 0;
    secondsRemaining = 0;

    // Countdown timer
    protected countdown$ = interval(1000);
    protected destroy$ = new Subject<void>();

    // Session storage key
    private readonly DISMISSAL_KEY = 'trial_banner_dismissed';

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

        // Update trial information
        this.updateTrialInfo();

        // Auto-hide if not in trial
        if (this.autoHide && (!this.subscription || !this.subscription.is_trialing)) {
            this.isVisible = false;
            return;
        }
    }

    /**
     * Start countdown timer for trial expiration
     */
    protected startCountdown(): void {
        this.countdown$
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.updateTrialInfo();
                this.cdr.detectChanges();
            });
    }

    /**
     * Update trial information and calculate remaining time
     */
    protected updateTrialInfo(): void {
        if (!this.subscription?.trial_ends_at) {
            this.isVisible = false;
            return;
        }

        const trialEnd = new Date(this.subscription.trial_ends_at);
        const now = new Date();
        const diff = trialEnd.getTime() - now.getTime();

        if (diff <= 0) {
            // Trial has expired
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

        // Determine urgency level
        this.isUrgent = days <= this.urgencyThreshold;
    }

    /**
     * Handle upgrade button click
     */
    onUpgradeClick(): void {
        this.onUpgrade.emit();

        // Navigate to pricing page if no custom handler
        this.router.navigate(['/pricing']);
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
        if (!this.isUrgent) return 'trial-normal';

        if (this.daysRemaining === 0) return 'trial-expired';
        if (this.daysRemaining === 1) return 'trial-critical';
        if (this.daysRemaining <= 3) return 'trial-urgent';

        return 'trial-warning';
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
        if (this.daysRemaining === 0) {
            return 'Your trial expires today!';
        }

        if (this.daysRemaining === 1) {
            return 'Your trial expires tomorrow!';
        }

        if (this.daysRemaining <= this.urgencyThreshold) {
            return `Your trial expires in ${this.daysRemaining} day${this.daysRemaining !== 1 ? 's' : ''}!`;
        }

        return `${this.daysRemaining} day${this.daysRemaining !== 1 ? 's' : ''} remaining in your trial`;
    }

    /**
     * Get banner title based on urgency
     */
    getBannerTitle(): string {
        if (this.isUrgent) {
            return '⚠️ Trial Expiring Soon';
        }

        return '🚀 Free Trial Active';
    }

    /**
     * Check if banner should be visible
     */
    shouldShow(): boolean {
        return this.isVisible &&
            (this.subscription?.is_trialing === true) &&
            !!this.subscription.trial_ends_at &&
            new Date(this.subscription.trial_ends_at) > new Date();
    }

    /**
     * Reset dismissal state (for testing or admin use)
     */
    resetDismissal(): void {
        sessionStorage.removeItem(this.DISMISSAL_KEY);
        this.isVisible = true;
        this.updateTrialInfo();
    }
}