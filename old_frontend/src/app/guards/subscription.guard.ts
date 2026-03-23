import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { BillingService } from '../services/billing.service';
import { ISubscription } from '../models/subscription.model';
import { IPlan } from '../models/plan.model';

/**
 * Interface for route data configuration for subscription guard
 */
export interface SubscriptionGuardData {
    /** Whether the route requires a subscription */
    requiresSubscription?: boolean;
    /** Minimum plan tier required (e.g., 'basic', 'pro', 'enterprise') */
    minTier?: string;
    /** Specific features required for access */
    requiredFeatures?: string[];
    /** Whether access is allowed during grace period */
    allowGracePeriod?: boolean;
    /** Custom redirect URL when access is denied */
    redirectUrl?: string;
    /** Custom message to show when access is denied */
    denyMessage?: string;
}

/**
 * Subscription guard that protects routes based on subscription status, plan tier, and features.
 * 
 * This guard implements Angular's CanActivate interface to control access to routes
 * based on the user's subscription status, plan tier, and available features.
 * 
 * @example
 * ```typescript
 * const routes: Routes = [
 *   {
 *     path: 'analytics',
 *     component: AnalyticsComponent,
 *     canActivate: [SubscriptionGuard],
 *     data: {
 *       requiresSubscription: true,
 *       requiredFeatures: ['analytics'],
 *       minTier: 'pro'
 *     } as SubscriptionGuardData
 *   },
 *   {
 *     path: 'billing',
 *     component: BillingComponent,
 *     canActivate: [SubscriptionGuard],
 *     data: {
 *       requiresSubscription: false // Allow access to billing page even without subscription
 *     } as SubscriptionGuardData
 *   }
 * ];
 * ```
 */
@Injectable({
    providedIn: 'root'
})
export class SubscriptionGuard implements CanActivate {
    // Plan tier hierarchy for comparison
    private readonly tierHierarchy: Record<string, number> = {
        'basic': 1,
        'pro': 2,
        'enterprise': 3,
        'free': 0
    };

    constructor(
        private readonly billingService: BillingService,
        private readonly router: Router
    ) { }

    /**
     * Determines if a route can be activated based on subscription requirements.
     * 
     * @param route The activated route snapshot
     * @param state The router state snapshot
     * @returns Observable<boolean> indicating if access is allowed
     */
    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean> {
        const guardData = route.data as SubscriptionGuardData;

        // Default configuration
        const config: Required<SubscriptionGuardData> = {
            requiresSubscription: guardData.requiresSubscription ?? true,
            minTier: guardData.minTier ?? 'free',
            requiredFeatures: guardData.requiredFeatures ?? [],
            allowGracePeriod: guardData.allowGracePeriod ?? true,
            redirectUrl: guardData.redirectUrl ?? '/billing',
            denyMessage: guardData.denyMessage ?? ''
        };

        // If route doesn't require subscription, allow access
        if (!config.requiresSubscription) {
            return of(true);
        }

        // Get current subscription and validate access
        return this.billingService.getCurrentSubscription().pipe(
            take(1),
            map(subscription => this.validateSubscription(subscription, config, state.url)),
            catchError(error => {
                console.error('Error checking subscription:', error);
                // On error, redirect to billing and deny access
                this.handleAccessDenied(config.redirectUrl, 'Unable to verify subscription status');
                return of(false);
            })
        );
    }

    /**
     * Validates subscription against guard requirements.
     * 
     * @param subscription The user's subscription
     * @param config Guard configuration
     * @param currentUrl The current URL being accessed
     * @returns boolean indicating if access is allowed
     */
    private validateSubscription(
        subscription: ISubscription | null,
        config: Required<SubscriptionGuardData>,
        currentUrl: string
    ): boolean {
        // Case 1: No subscription at all
        if (!subscription) {
            this.handleAccessDenied(config.redirectUrl, 'This feature requires an active subscription');
            return false;
        }

        // Case 2: Check if subscription is active or in trial
        if (!this.isSubscriptionActive(subscription, config.allowGracePeriod)) {
            this.handleSubscriptionExpired(subscription, config.redirectUrl);
            return false;
        }

        // Case 3: Check minimum tier requirement
        if (!this.meetsMinimumTier(subscription, config.minTier)) {
            this.handleInsufficientTier(subscription, config.minTier, config.redirectUrl);
            return false;
        }

        // Case 4: Check required features
        if (!this.hasRequiredFeatures(subscription, config.requiredFeatures)) {
            this.handleMissingFeatures(subscription, config.requiredFeatures, config.redirectUrl);
            return false;
        }

        // All checks passed, allow access
        return true;
    }

    /**
     * Checks if a subscription is active or within allowed grace period.
     * 
     * @param subscription The subscription to check
     * @param allowGracePeriod Whether to allow access during grace period
     * @returns boolean indicating if subscription is active
     */
    private isSubscriptionActive(subscription: ISubscription, allowGracePeriod: boolean): boolean {
        // Active or trialing subscriptions are always allowed
        if (subscription.is_active || subscription.is_trialing) {
            return true;
        }

        // Allow grace period access if configured
        if (allowGracePeriod && subscription.is_within_grace_period) {
            return true;
        }

        // All other statuses are not allowed
        return false;
    }

    /**
     * Checks if the subscription meets the minimum tier requirement.
     * 
     * @param subscription The subscription to check
     * @param minTier The minimum required tier
     * @returns boolean indicating if tier requirement is met
     */
    private meetsMinimumTier(subscription: ISubscription, minTier: string): boolean {
        // If no plan is associated, deny access
        if (!subscription.plan) {
            return false;
        }

        const currentTierLevel = this.tierHierarchy[subscription.plan.slug.toLowerCase()] ?? 0;
        const requiredTierLevel = this.tierHierarchy[minTier.toLowerCase()] ?? 0;

        return currentTierLevel >= requiredTierLevel;
    }

    /**
     * Checks if the subscription has all required features.
     * 
     * @param subscription The subscription to check
     * @param requiredFeatures Array of required feature names
     * @returns boolean indicating if all required features are available
     */
    private hasRequiredFeatures(subscription: ISubscription, requiredFeatures: string[]): boolean {
        // If no features are required, allow access
        if (requiredFeatures.length === 0) {
            return true;
        }

        // If no plan is associated, deny access
        if (!subscription.plan) {
            return false;
        }

        // Check if all required features are in the plan's features
        const planFeatures = subscription.plan.features.map(f => f.toLowerCase());

        return requiredFeatures.every(feature =>
            planFeatures.includes(feature.toLowerCase())
        );
    }

    /**
     * Handles access denial by redirecting to appropriate page.
     * 
     * @param redirectUrl The URL to redirect to
     * @param message Optional message to display
     */
    private handleAccessDenied(redirectUrl: string, message?: string): void {
        // Store message for display on the target page if needed
        if (message) {
            sessionStorage.setItem('subscriptionGuardMessage', message);
        }

        this.router.navigate([redirectUrl]);
    }

    /**
     * Handles expired subscription by redirecting to billing page.
     * 
     * @param subscription The expired subscription
     * @param redirectUrl The URL to redirect to
     */
    private handleSubscriptionExpired(subscription: ISubscription, redirectUrl: string): void {
        let message = 'Your subscription has expired';

        if (subscription.is_within_grace_period) {
            message = 'Your subscription is in grace period and will expire soon';
        } else if (subscription.is_canceled) {
            message = 'Your subscription has been canceled';
        } else if (subscription.is_past_due) {
            message = 'Your subscription payment is past due';
        }

        this.handleAccessDenied(redirectUrl, message);
    }

    /**
     * Handles insufficient plan tier by redirecting to upgrade page.
     * 
     * @param subscription The current subscription
     * @param requiredTier The required minimum tier
     * @param redirectUrl The URL to redirect to
     */
    private handleInsufficientTier(
        subscription: ISubscription,
        requiredTier: string,
        redirectUrl: string
    ): void {
        const currentTier = subscription.plan?.slug || 'free';
        const message = `This feature requires a ${requiredTier} plan or higher. Your current plan is ${currentTier}.`;

        // Redirect to billing with upgrade intent
        this.router.navigate([redirectUrl], {
            queryParams: {
                upgrade: 'true',
                required_tier: requiredTier,
                current_tier: currentTier
            }
        });
    }

    /**
     * Handles missing required features by redirecting to upgrade page.
     * 
     * @param subscription The current subscription
     * @param requiredFeatures Array of missing required features
     * @param redirectUrl The URL to redirect to
     */
    private handleMissingFeatures(
        subscription: ISubscription,
        requiredFeatures: string[],
        redirectUrl: string
    ): void {
        const featuresList = requiredFeatures.join(', ');
        const message = `This feature requires: ${featuresList}`;

        // Redirect to billing with upgrade intent
        this.router.navigate([redirectUrl], {
            queryParams: {
                upgrade: 'true',
                required_features: requiredFeatures.join(','),
                reason: 'missing_features'
            }
        });
    }
}