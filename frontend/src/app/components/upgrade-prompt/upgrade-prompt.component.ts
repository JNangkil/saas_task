import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { BillingService } from '../../services/billing.service';
// import { NotificationService } from '../../services/notification.service';
import { ISubscription, IUsageStatistics } from '../../models/subscription.model';
import { IPlan as IPlanModel } from '../../models/plan.model';

/**
 * UpgradePromptComponent displays a prompt when users hit plan limits.
 * Shows upgrade suggestions with next higher plan options.
 * 
 * Features:
 * - Shows when user hits plan limits
 * - Suggests next higher plan
 * - Quick upgrade button
 * - Dismiss option with session storage persistence
 * - Responsive design with accessibility support
 * - Smooth animations and transitions
 */
@Component({
    selector: 'app-upgrade-prompt',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './upgrade-prompt.component.html',
    styleUrls: ['./upgrade-prompt.component.css']
})
export class UpgradePromptComponent implements OnInit, OnDestroy {
    // Input properties
    @Input() currentSubscription: ISubscription | null = null;
    @Input() usageStatistics: IUsageStatistics | null = null;
    @Input() availablePlans: IPlanModel[] = [];
    @Input() showUpgradeButton = true;
    @Input() autoHide = true;
    @Input() thresholdPercentage = 80; // Show prompt when usage exceeds this percentage

    // Output events
    @Output() onUpgrade = new EventEmitter<IPlanModel>();
    @Output() onDismiss = new EventEmitter<void>();

    // Component state
    isVisible = true;
    isUrgent = false;
    overLimitFeatures: string[] = [];
    recommendedPlan: IPlanModel | null = null;
    loadingPlans = false;

    // Unsubscribe subject
    protected destroy$ = new Subject<void>();

    // Session storage key
    private readonly DISMISSAL_KEY = 'upgrade_prompt_dismissed';

    constructor(
        private billingService: BillingService,
        // private notificationService: NotificationService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.initializePrompt();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize prompt state and check dismissal status
     */
    protected initializePrompt(): void {
        // Check if prompt was previously dismissed
        const isDismissed = sessionStorage.getItem(this.DISMISSAL_KEY) === 'true';

        if (isDismissed) {
            this.isVisible = false;
            return;
        }

        // Update upgrade information
        this.updateUpgradeInfo();

        // Auto-hide if no usage statistics or subscription
        if (this.autoHide && (!this.usageStatistics || !this.currentSubscription)) {
            this.isVisible = false;
            return;
        }
    }

    /**
     * Update upgrade information and determine if prompt should show
     */
    protected updateUpgradeInfo(): void {
        if (!this.usageStatistics || !this.availablePlans.length) {
            this.isVisible = false;
            return;
        }

        // Check if user is over any limits
        this.overLimitFeatures = this.getOverLimitFeatures();

        if (this.overLimitFeatures.length === 0) {
            this.isVisible = false;
            return;
        }

        // Find recommended plan
        this.recommendedPlan = this.findRecommendedPlan();

        // Determine urgency based on how many features are over limit
        this.isUrgent = this.overLimitFeatures.length >= 2 ||
            this.getMaxUsagePercentage() >= 90;
    }

    /**
     * Get features that are over their limits
     */
    protected getOverLimitFeatures(): string[] {
        if (!this.usageStatistics?.is_over_limit) {
            return [];
        }

        const overLimitFeatures: string[] = [];

        for (const [feature, isOver] of Object.entries(this.usageStatistics.is_over_limit)) {
            if (isOver) {
                overLimitFeatures.push(this.formatFeatureName(feature));
            }
        }

        return overLimitFeatures;
    }

    /**
     * Get maximum usage percentage across all features
     */
    protected getMaxUsagePercentage(): number {
        if (!this.usageStatistics?.usage_percentage) {
            return 0;
        }

        const percentages = Object.values(this.usageStatistics.usage_percentage);
        return Math.max(...percentages as number[]);
    }

    /**
     * Format feature name for display
     */
    protected formatFeatureName(featureName: string): string {
        return featureName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Find the best recommended plan based on current usage
     */
    protected findRecommendedPlan(): IPlanModel | null {
        if (!this.currentSubscription || !this.availablePlans.length) {
            return null;
        }

        const currentPlan = this.availablePlans.find(p => p.id === this.currentSubscription?.plan_id);
        if (!currentPlan) {
            return null;
        }

        // Find next higher plan
        const currentPlanIndex = this.availablePlans.findIndex(p => p.id === currentPlan.id);
        const nextHigherPlans = this.availablePlans.slice(currentPlanIndex + 1);

        if (nextHigherPlans.length > 0) {
            return nextHigherPlans[0];
        }

        // If no higher plans, find the plan that best fits current usage
        return this.findBestFitPlan();
    }

    /**
     * Find the plan that best accommodates current usage
     */
    protected findBestFitPlan(): IPlanModel | null {
        if (!this.usageStatistics?.current_usage) {
            return null;
        }

        return this.availablePlans.find(plan => {
            return this.planAccommodatesUsage(plan, this.usageStatistics?.current_usage || {});
        }) || null;
    }

    /**
     * Check if a plan can accommodate current usage
     */
    protected planAccommodatesUsage(plan: IPlanModel, currentUsage: any): boolean {
        const limits = plan.limits;

        for (const [feature, usage] of Object.entries(currentUsage)) {
            const limit = limits[feature as keyof typeof limits];

            // If limit is undefined or -1 (unlimited), it accommodates
            if (limit === undefined || limit === -1) {
                continue;
            }

            // If usage exceeds limit, plan doesn't accommodate
            if (typeof usage === 'number' && typeof limit === 'number' && usage > limit) {
                return false;
            }
        }

        return true;
    }

    /**
     * Handle upgrade button click
     */
    onUpgradeClick(plan?: IPlanModel): void {
        const selectedPlan = plan || this.recommendedPlan;

        if (!selectedPlan) {
            return;
        }

        this.onUpgrade.emit(selectedPlan);

        // Navigate to checkout if no custom handler
        this.router.navigate(['/pricing'], {
            queryParams: {
                plan: selectedPlan.slug,
                upgrade: 'true'
            }
        });
    }

    /**
     * Handle prompt dismissal
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
        if (this.isUrgent) return 'upgrade-prompt-urgent';
        return 'upgrade-prompt-normal';
    }

    /**
     * Get prompt title based on urgency
     */
    getPromptTitle(): string {
        if (this.isUrgent) {
            return '🚨 Plan Limits Exceeded';
        }

        return '💡 Upgrade Recommended';
    }

    /**
     * Get prompt message based on usage
     */
    getPromptMessage(): string {
        const overLimitCount = this.overLimitFeatures.length;

        if (overLimitCount === 0) {
            return 'You\'re approaching your plan limits.';
        }

        if (overLimitCount === 1) {
            return `You've reached your ${this.overLimitFeatures[0]} limit.`;
        }

        if (overLimitCount <= 3) {
            return `You've reached limits for: ${this.overLimitFeatures.join(', ')}.`;
        }

        return `You've exceeded multiple plan limits. Upgrade to continue.`;
    }

    /**
     * Get usage percentage for a specific feature
     */
    getUsagePercentage(feature: string): number {
        if (!this.usageStatistics?.usage_percentage) {
            return 0;
        }

        return this.usageStatistics.usage_percentage[feature as keyof typeof this.usageStatistics.usage_percentage] || 0;
    }

    /**
     * Get progress bar color based on percentage
     */
    getProgressColor(percentage: number): string {
        if (percentage >= 100) return 'progress-danger';
        if (percentage >= 90) return 'progress-warning';
        if (percentage >= 75) return 'progress-caution';
        return 'progress-success';
    }

    /**
     * Check if prompt should be visible
     */
    shouldShow(): boolean {
        return this.isVisible &&
            this.overLimitFeatures.length > 0 &&
            this.currentSubscription !== null &&
            this.availablePlans.length > 0;
    }

    /**
     * Reset dismissal state (for testing or admin use)
     */
    resetDismissal(): void {
        sessionStorage.removeItem(this.DISMISSAL_KEY);
        this.isVisible = true;
        this.updateUpgradeInfo();
    }

    /**
     * Get upgrade button text
     */
    getUpgradeButtonText(plan?: IPlanModel): string {
        const selectedPlan = plan || this.recommendedPlan;

        if (!selectedPlan) {
            return 'Upgrade Plan';
        }

        const currentPlan = this.availablePlans.find(p => p.id === this.currentSubscription?.plan_id);

        if (!currentPlan) {
            return `Upgrade to ${selectedPlan.name}`;
        }

        if (selectedPlan.price > currentPlan.price) {
            return `Upgrade to ${selectedPlan.name}`;
        }

        return `Change to ${selectedPlan.name}`;
    }

    /**
     * Get plan comparison text
     */
    getPlanComparisonText(plan: IPlanModel): string {
        const currentPlan = this.availablePlans.find(p => p.id === this.currentSubscription?.plan_id);

        if (!currentPlan) {
            return '';
        }

        const priceDiff = parseFloat(plan.price) - parseFloat(currentPlan.price);

        if (priceDiff > 0) {
            return `+${plan.currency_symbol}${priceDiff.toFixed(2)}/month`;
        }

        if (priceDiff < 0) {
            return `${plan.currency_symbol}${Math.abs(priceDiff).toFixed(2)}/month savings`;
        }

        return 'Same price';
    }

    /**
     * Get feature highlights for a plan
     */
    getPlanHighlights(plan: IPlanModel): string[] {
        return plan.feature_highlights.slice(0, 3); // Show top 3 features
    }
}