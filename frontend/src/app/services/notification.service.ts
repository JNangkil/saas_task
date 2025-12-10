import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of, Subject } from 'rxjs';
import { map, distinctUntilChanged, take, takeUntil } from 'rxjs/operators';

import { BillingService } from './billing.service';
import { ISubscription, IUsageStatistics } from '../models/subscription.model';
import { IPlan as IPlanModel } from '../models/plan.model';

/**
 * Notification types for different banner displays
 */
export type NotificationType = 'trial' | 'past_due' | 'upgrade_prompt' | 'none';

/**
 * Notification state interface
 */
export interface NotificationState {
    type: NotificationType;
    isVisible: boolean;
    isUrgent: boolean;
    message?: string;
    data?: any;
}

/**
 * NotificationService manages the display of all notification banners
 * including trial banners, past due banners, and upgrade prompts.
 * 
 * Features:
 * - Manages visibility state for all notification types
 * - Tracks dismissed notifications in localStorage/sessionStorage
 * - Determines which notification to show based on subscription status
 * - Provides observable streams for notification state changes
 * - Handles notification dismissal and persistence
 * - Integrates with BillingService for subscription data
 */
@Injectable({
    providedIn: 'root'
})
export class NotificationService implements OnDestroy {
    // Private state subjects
    private readonly notificationState$ = new BehaviorSubject<NotificationState>({
        type: 'none',
        isVisible: false,
        isUrgent: false
    });

    private destroy$ = new Subject<void>();

    // Public observables
    public readonly notificationState = this.notificationState$.asObservable();
    public readonly showTrialBanner$ = this.notificationState$.pipe(
        map(state => state.type === 'trial' && state.isVisible)
    );
    public readonly showPastDueBanner$ = this.notificationState$.pipe(
        map(state => state.type === 'past_due' && state.isVisible)
    );
    public readonly showUpgradePrompt$ = this.notificationState$.pipe(
        map(state => state.type === 'upgrade_prompt' && state.isVisible)
    );
    public readonly hasActiveNotification$ = this.notificationState$.pipe(
        map(state => state.isVisible && state.type !== 'none')
    );

    // Storage keys
    private readonly TRIAL_DISMISSAL_KEY = 'trial_banner_dismissed';
    private readonly PAST_DUE_DISMISSAL_KEY = 'past_due_banner_dismissed';
    private readonly UPGRADE_PROMPT_DISMISSAL_KEY = 'upgrade_prompt_dismissed';

    constructor(
        private billingService: BillingService
    ) { }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize notification service and start monitoring subscription changes
     */
    initialize(): void {
        this.monitorSubscriptionChanges();
        this.evaluateNotificationState();
    }

    /**
     * Monitor subscription changes to update notification display
     */
    private monitorSubscriptionChanges(): void {
        combineLatest([
            this.billingService.currentSubscription$,
            this.billingService.loading$
        ]).pipe(
            distinctUntilChanged(),
            take(1),
            takeUntil(this.destroy$)
        ).subscribe(([subscription, loading]) => {
            if (!loading) {
                this.evaluateNotificationState(subscription);
            }
        });
    }

    /**
     * Evaluate which notification should be displayed based on subscription state
     */
    evaluateNotificationState(subscription?: ISubscription | null): void {
        if (!subscription) {
            this.hideAllNotifications();
            return;
        }

        // Check for past due status (highest priority)
        if (subscription.is_past_due) {
            this.showPastDueNotification(subscription);
            return;
        }

        // Check for trial status
        if (subscription.is_trialing) {
            this.showTrialNotification(subscription);
            return;
        }

        // Check for upgrade prompt (will be evaluated separately)
        this.checkUpgradePrompt(subscription);
    }

    /**
     * Show trial notification banner
     */
    private showTrialNotification(subscription: ISubscription): void {
        const isDismissed = this.isNotificationDismissed(this.TRIAL_DISMISSAL_KEY);

        if (isDismissed) {
            this.hideAllNotifications();
            return;
        }

        const trialDaysRemaining = subscription.trial_days_remaining || 0;
        const isUrgent = trialDaysRemaining <= 3; // Urgent if 3 days or less

        this.updateNotificationState({
            type: 'trial',
            isVisible: true,
            isUrgent,
            message: this.getTrialMessage(trialDaysRemaining, isUrgent),
            data: {
                subscription,
                trialDaysRemaining,
                trialEndsAt: subscription.trial_ends_at
            }
        });
    }

    /**
     * Show past due notification banner
     */
    private showPastDueNotification(subscription: ISubscription): void {
        const isDismissed = this.isNotificationDismissed(this.PAST_DUE_DISMISSAL_KEY);

        if (isDismissed) {
            this.hideAllNotifications();
            return;
        }

        const daysRemaining = this.calculateDaysRemaining(subscription.ends_at);
        const isUrgent = daysRemaining <= 2; // Urgent if 2 days or less

        this.updateNotificationState({
            type: 'past_due',
            isVisible: true,
            isUrgent,
            message: this.getPastDueMessage(daysRemaining, isUrgent),
            data: {
                subscription,
                daysRemaining,
                gracePeriodEndsAt: subscription.ends_at,
                isWithinGracePeriod: subscription.is_within_grace_period
            }
        });
    }

    /**
     * Check if upgrade prompt should be shown
     */
    private checkUpgradePrompt(subscription: ISubscription): void {
        // This would typically be triggered by usage statistics
        // For now, we'll hide it and let components handle their own visibility
        this.hideUpgradePrompt();
    }

    /**
     * Show upgrade prompt notification
     */
    showUpgradePrompt(usageStatistics: IUsageStatistics, availablePlans: IPlanModel[]): void {
        const isDismissed = this.isNotificationDismissed(this.UPGRADE_PROMPT_DISMISSAL_KEY);

        if (isDismissed) {
            this.hideAllNotifications();
            return;
        }

        // Check if user is over any limits
        const overLimitFeatures = this.getOverLimitFeatures(usageStatistics);

        if (overLimitFeatures.length === 0) {
            this.hideUpgradePrompt();
            return;
        }

        this.updateNotificationState({
            type: 'upgrade_prompt',
            isVisible: true,
            isUrgent: overLimitFeatures.length >= 2,
            message: this.getUpgradeMessage(overLimitFeatures),
            data: {
                usageStatistics,
                availablePlans,
                overLimitFeatures
            }
        });
    }

    /**
     * Hide all notifications
     */
    hideAllNotifications(): void {
        this.updateNotificationState({
            type: 'none',
            isVisible: false,
            isUrgent: false
        });
    }

    /**
     * Hide trial banner
     */
    hideTrialBanner(): void {
        const currentState = this.notificationState$.value;

        if (currentState.type === 'trial') {
            this.updateNotificationState({
                ...currentState,
                isVisible: false
            });
        }
    }

    /**
     * Hide past due banner
     */
    hidePastDueBanner(): void {
        const currentState = this.notificationState$.value;

        if (currentState.type === 'past_due') {
            this.updateNotificationState({
                ...currentState,
                isVisible: false
            });
        }
    }

    /**
     * Hide upgrade prompt
     */
    hideUpgradePrompt(): void {
        const currentState = this.notificationState$.value;

        if (currentState.type === 'upgrade_prompt') {
            this.updateNotificationState({
                ...currentState,
                isVisible: false
            });
        }
    }

    /**
     * Dismiss current notification
     */
    dismissCurrentNotification(): void {
        const currentState = this.notificationState$.value;

        if (currentState.type === 'none') {
            return;
        }

        const storageKey = this.getStorageKey(currentState.type);
        this.setNotificationDismissed(storageKey);

        this.updateNotificationState({
            ...currentState,
            isVisible: false
        });
    }

    /**
     * Reset dismissal state for a specific notification type
     */
    resetDismissal(notificationType: NotificationType): void {
        const storageKey = this.getStorageKey(notificationType);
        this.removeNotificationDismissed(storageKey);

        // Re-evaluate notification state
        this.billingService.currentSubscription$.pipe(
            take(1),
            takeUntil(this.destroy$)
        ).subscribe(subscription => {
            if (subscription) {
                this.evaluateNotificationState(subscription);
            }
        });
    }

    /**
     * Get current notification state as observable
     */
    getCurrentNotificationState(): Observable<NotificationState> {
        return this.notificationState$.asObservable();
    }

    /**
     * Check if a notification type is currently active
     */
    isNotificationActive(notificationType: NotificationType): boolean {
        const currentState = this.notificationState$.value;
        return currentState.type === notificationType && currentState.isVisible;
    }

    /**
     * Get storage key for notification type
     */
    private getStorageKey(notificationType: NotificationType): string {
        switch (notificationType) {
            case 'trial':
                return this.TRIAL_DISMISSAL_KEY;
            case 'past_due':
                return this.PAST_DUE_DISMISSAL_KEY;
            case 'upgrade_prompt':
                return this.UPGRADE_PROMPT_DISMISSAL_KEY;
            default:
                return '';
        }
    }

    /**
     * Check if notification is dismissed
     */
    private isNotificationDismissed(storageKey: string): boolean {
        try {
            return sessionStorage.getItem(storageKey) === 'true';
        } catch {
            return false;
        }
    }

    /**
     * Set notification as dismissed
     */
    private setNotificationDismissed(storageKey: string): void {
        try {
            sessionStorage.setItem(storageKey, 'true');
        } catch (error) {
            console.warn('Failed to save notification dismissal:', error);
        }
    }

    /**
     * Remove notification dismissal
     */
    private removeNotificationDismissed(storageKey: string): void {
        try {
            sessionStorage.removeItem(storageKey);
        } catch (error) {
            console.warn('Failed to remove notification dismissal:', error);
        }
    }

    /**
     * Calculate days remaining from date string
     */
    private calculateDaysRemaining(dateString?: string): number {
        if (!dateString) {
            return 0;
        }

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();

        return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }

    /**
     * Get over limit features from usage statistics
     */
    private getOverLimitFeatures(usageStatistics: IUsageStatistics): string[] {
        if (!usageStatistics?.is_over_limit) {
            return [];
        }

        const overLimitFeatures: string[] = [];

        for (const [feature, isOver] of Object.entries(usageStatistics.is_over_limit)) {
            if (isOver) {
                overLimitFeatures.push(this.formatFeatureName(feature));
            }
        }

        return overLimitFeatures;
    }

    /**
     * Format feature name for display
     */
    private formatFeatureName(featureName: string): string {
        return featureName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get trial notification message
     */
    private getTrialMessage(daysRemaining: number, isUrgent: boolean): string {
        if (daysRemaining === 0) {
            return 'Your trial expires today!';
        }

        if (daysRemaining === 1) {
            return 'Your trial expires tomorrow!';
        }

        if (isUrgent) {
            return `Your trial expires in ${daysRemaining} days!`;
        }

        return `${daysRemaining} days remaining in your trial`;
    }

    /**
     * Get past due notification message
     */
    private getPastDueMessage(daysRemaining: number, isUrgent: boolean): string {
        if (daysRemaining === 0) {
            return 'Your grace period expires today! Update your payment method immediately.';
        }

        if (daysRemaining === 1) {
            return 'Your grace period expires tomorrow! Update your payment method now.';
        }

        if (isUrgent) {
            return `Your grace period expires in ${daysRemaining} days!`;
        }

        return `${daysRemaining} days remaining in grace period`;
    }

    /**
     * Get upgrade prompt message
     */
    private getUpgradeMessage(overLimitFeatures: string[]): string {
        const count = overLimitFeatures.length;

        if (count === 0) {
            return 'You\'re approaching your plan limits.';
        }

        if (count === 1) {
            return `You\'ve reached your ${overLimitFeatures[0]} limit.`;
        }

        if (count <= 3) {
            return `You\'ve reached limits for: ${overLimitFeatures.join(', ')}.`;
        }

        return `You\'ve exceeded multiple plan limits. Upgrade to continue.`;
    }

    /**
     * Update notification state
     */
    private updateNotificationState(state: Partial<NotificationState>): void {
        const currentState = this.notificationState$.value;
        this.notificationState$.next({ ...currentState, ...state });
    }
}