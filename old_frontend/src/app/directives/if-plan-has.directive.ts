import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Observable, Subject, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, takeUntil, catchError, switchMap, startWith } from 'rxjs/operators';
import { BillingService } from '../services/billing.service';
import { ISubscription, IUsageStatistics } from '../models/subscription.model';
import { IPlan, IPlanLimits } from '../models/plan.model';

/**
 * Types of plan feature checks supported by the directive
 */
export type PlanFeatureCheck =
    | string                           // Feature name (e.g., 'analytics')
    | { minUsers: number }            // Minimum users check
    | { minWorkspaces: number }       // Minimum workspaces check
    | { minBoards: number }          // Minimum boards check
    | { minStorage: number }         // Minimum storage in MB
    | { minApiCalls: number }        // Minimum API calls per month
    | { tier: 'basic' | 'pro' | 'enterprise' | string }  // Plan tier check
    | { customLimit: { name: string; value: number } };     // Custom limit check

/**
 * Configuration options for the directive
 */
export interface IfPlanHasOptions {
    /** Whether to show loading state while checking subscription */
    showLoading?: boolean;
    /** Template to show during loading */
    loadingTemplate?: TemplateRef<any>;
    /** Whether to re-evaluate when subscription changes */
    trackChanges?: boolean;
}

/**
 * Structural directive that conditionally renders content based on the current subscription plan.
 * 
 * This directive provides feature gating functionality by checking if the current plan
 * includes specific features, meets certain limits, or is at a particular tier.
 * 
 * @example
 * ```html
 * <!-- Check for feature -->
 * <div *ifPlanHas="'analytics'">
 *   <analytics-dashboard></analytics-dashboard>
 * </div>
 * 
 * <!-- Check for minimum users -->
 * <div *ifPlanHas="{ minUsers: 10 }">
 *   <team-management></team-management>
 * </div>
 * 
 * <!-- With else block -->
 * <div *ifPlanHas="'api_access'; else noApi">
 *   <api-settings></api-settings>
 * </div>
 * <ng-template #noApi>
 *   <upgrade-prompt feature="api_access"></upgrade-prompt>
 * </ng-template>
 * 
 * <!-- With options -->
 * <div *ifPlanHas="'advanced_features'; options: { showLoading: true }">
 *   <advanced-features></advanced-features>
 * </div>
 * ```
 */
@Directive({
    selector: '[ifPlanHas]',
    standalone: true
})
export class IfPlanHasDirective implements OnInit, OnDestroy {
    /**
     * The feature check to perform - can be a string for feature name or an object for limits/tier checks
     */
    @Input() ifPlanHas!: PlanFeatureCheck | PlanFeatureCheck[];

    /**
     * Optional configuration for the directive behavior
     */
    @Input() ifPlanHasOptions: IfPlanHasOptions = {};

    /**
     * Reference to the else template when condition is not met
     */
    @Input() ifPlanHasElse: TemplateRef<any> | null = null;

    private hasView = false;
    private loadingView = false;
    private destroy$ = new Subject<void>();
    private currentSubscription: ISubscription | null = null;
    private currentUsage: IUsageStatistics | null = null;
    private isLoading$ = new BehaviorSubject<boolean>(false);

    constructor(
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef,
        private billingService: BillingService,
        private cdr: ChangeDetectorRef
    ) { }

    /**
     * Initialize the directive and start checking subscription
     */
    ngOnInit(): void {
        this.initializeSubscriptionTracking();
    }

    /**
     * Clean up subscriptions when directive is destroyed
     */
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Initialize subscription tracking and perform initial check
     */
    private initializeSubscriptionTracking(): void {
        // Get current subscription and usage data
        const subscription$ = this.billingService.currentSubscription$.pipe(
            switchMap(subscription => {
                this.currentSubscription = subscription;

                // If we have a subscription, get usage statistics
                if (subscription && subscription.plan) {
                    return this.billingService.getUsageStatistics().pipe(
                        map(usage => ({ subscription, usage })),
                        catchError(() => of({ subscription, usage: null }))
                    );
                }

                return of({ subscription, usage: null });
            }),
            startWith({ subscription: this.currentSubscription, usage: this.currentUsage })
        );

        // Track loading state
        this.billingService.loading$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(loading => {
            this.isLoading$.next(loading);
        });

        // Subscribe to changes and evaluate condition
        subscription$.pipe(
            takeUntil(this.destroy$)
        ).subscribe(({ subscription, usage }) => {
            this.currentSubscription = subscription;
            this.currentUsage = usage;
            this.evaluateCondition();
        });

        // If no cached subscription, fetch it
        if (!this.currentSubscription) {
            this.billingService.getCurrentSubscription().pipe(
                takeUntil(this.destroy$),
                catchError(() => of(null))
            ).subscribe();
        }
    }

    /**
     * Evaluate the condition based on the current subscription and usage
     */
    private evaluateCondition(): void {
        const options = this.ifPlanHasOptions || {};

        // Show loading template if configured and we're still loading
        if (options.showLoading && this.shouldShowLoading()) {
            this.showLoadingView();
            return;
        }

        // Evaluate the condition
        const conditionMet = this.checkPlanCondition();

        // Update the view based on the condition
        this.updateView(conditionMet);
    }

    /**
     * Check if we should show loading state
     */
    private shouldShowLoading(): boolean {
        let isLoading = false;
        this.isLoading$.subscribe(loading => isLoading = loading).unsubscribe();
        return isLoading || !this.currentSubscription;
    }

    /**
     * Show loading template if available
     */
    private showLoadingView(): void {
        if (this.loadingView) return;

        this.viewContainer.clear();
        this.hasView = false;
        this.loadingView = true;

        const options = this.ifPlanHasOptions || {};
        if (options.loadingTemplate) {
            this.viewContainer.createEmbeddedView(options.loadingTemplate);
        }
    }

    /**
     * Update the view based on whether the condition is met
     */
    private updateView(conditionMet: boolean): void {
        if (conditionMet && !this.hasView) {
            // Show the main template
            this.viewContainer.clear();
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
            this.loadingView = false;
        } else if (!conditionMet && this.hasView) {
            // Hide the main template and show else template if available
            this.viewContainer.clear();
            this.hasView = false;
            this.loadingView = false;

            if (this.ifPlanHasElse) {
                this.viewContainer.createEmbeddedView(this.ifPlanHasElse);
            }
        }

        // Trigger change detection
        this.cdr.markForCheck();
    }

    /**
     * Check if the plan condition is met based on the current subscription
     */
    private checkPlanCondition(): boolean {
        if (!this.currentSubscription || !this.currentSubscription.plan) {
            return false;
        }

        const plan = this.currentSubscription.plan;
        const checks = Array.isArray(this.ifPlanHas) ? this.ifPlanHas : [this.ifPlanHas];

        // All checks must pass (AND logic)
        return checks.every(check => this.evaluateSingleCheck(check, plan));
    }

    /**
     * Evaluate a single check against the plan
     */
    private evaluateSingleCheck(check: PlanFeatureCheck, plan: IPlan): boolean {
        // Handle string feature checks
        if (typeof check === 'string') {
            return this.checkFeature(check, plan);
        }

        // Handle object-based checks
        if (typeof check === 'object' && check !== null) {
            // Check for minimum users
            if ('minUsers' in check) {
                return this.checkMinUsers(check.minUsers, plan);
            }

            // Check for minimum workspaces
            if ('minWorkspaces' in check) {
                return this.checkMinWorkspaces(check.minWorkspaces, plan);
            }

            // Check for minimum boards
            if ('minBoards' in check) {
                return this.checkMinBoards(check.minBoards, plan);
            }

            // Check for minimum storage
            if ('minStorage' in check) {
                return this.checkMinStorage(check.minStorage, plan);
            }

            // Check for minimum API calls
            if ('minApiCalls' in check) {
                return this.checkMinApiCalls(check.minApiCalls, plan);
            }

            // Check for plan tier
            if ('tier' in check) {
                return this.checkTier(check.tier, plan);
            }

            // Check for custom limit
            if ('customLimit' in check) {
                return this.checkCustomLimit(check.customLimit.name, check.customLimit.value, plan);
            }
        }

        return false;
    }

    /**
     * Check if the plan includes a specific feature
     */
    private checkFeature(featureName: string, plan: IPlan): boolean {
        return plan.features.includes(featureName);
    }

    /**
     * Check if the plan supports at least the specified number of users
     */
    private checkMinUsers(minUsers: number, plan: IPlan): boolean {
        const maxUsers = plan.limits?.max_users;
        if (maxUsers === undefined) return false;
        return maxUsers >= minUsers || maxUsers === -1; // -1 represents unlimited
    }

    /**
     * Check if the plan supports at least the specified number of workspaces
     */
    private checkMinWorkspaces(minWorkspaces: number, plan: IPlan): boolean {
        const maxWorkspaces = plan.limits?.max_workspaces;
        if (maxWorkspaces === undefined) return false;
        return maxWorkspaces >= minWorkspaces || maxWorkspaces === -1;
    }

    /**
     * Check if the plan supports at least the specified number of boards
     */
    private checkMinBoards(minBoards: number, plan: IPlan): boolean {
        const maxBoards = plan.limits?.max_boards;
        if (maxBoards === undefined) return false;
        return maxBoards >= minBoards || maxBoards === -1;
    }

    /**
     * Check if the plan supports at least the specified storage in MB
     */
    private checkMinStorage(minStorage: number, plan: IPlan): boolean {
        const maxStorage = plan.limits?.max_storage_mb;
        if (maxStorage === undefined) return false;
        return maxStorage >= minStorage || maxStorage === -1;
    }

    /**
     * Check if the plan supports at least the specified number of API calls per month
     */
    private checkMinApiCalls(minApiCalls: number, plan: IPlan): boolean {
        const maxApiCalls = plan.limits?.max_api_calls_per_month;
        if (maxApiCalls === undefined) return false;
        return maxApiCalls >= minApiCalls || maxApiCalls === -1;
    }

    /**
     * Check if the plan is at least the specified tier
     */
    private checkTier(requiredTier: string, plan: IPlan): boolean {
        // Define tier hierarchy
        const tierHierarchy: Record<string, number> = {
            'basic': 0,
            'starter': 1,
            'pro': 2,
            'professional': 3,
            'business': 4,
            'enterprise': 5
        };

        const currentTierLevel = tierHierarchy[plan.slug.toLowerCase()] || 0;
        const requiredTierLevel = tierHierarchy[requiredTier.toLowerCase()] || 0;

        return currentTierLevel >= requiredTierLevel;
    }

    /**
     * Check a custom limit against the plan limits
     */
    private checkCustomLimit(limitName: string, requiredValue: number, plan: IPlan): boolean {
        const limitValue = plan.limits?.[limitName];
        if (limitValue === undefined) return false;
        return limitValue >= requiredValue || limitValue === -1;
    }
}