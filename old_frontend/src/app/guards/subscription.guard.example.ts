/**
 * Example usage of SubscriptionGuard in Angular routing configuration.
 * This file demonstrates how to properly configure routes with subscription requirements.
 * 
 * Copy and adapt these examples to your app-routing.module.ts or feature routing modules.
 */

import { Routes } from '@angular/router';
import { SubscriptionGuard, SubscriptionGuardData } from './subscription.guard';

// Example component imports (replace with your actual components)
// import { AnalyticsComponent } from '../components/analytics/analytics.component';
// import { BillingComponent } from '../components/billing/billing.component';
// import { DashboardComponent } from '../components/dashboard/dashboard.component';
// import { SettingsComponent } from '../components/settings/settings.component';
// import { AdminComponent } from '../components/admin/admin.component';

/**
 * Example routes configuration with SubscriptionGuard
 * 
 * These examples show different ways to configure subscription requirements
 * for various routes in your application.
 */
export const exampleRoutes: Routes = [
    {
        path: 'dashboard',
        // component: DashboardComponent,
        canActivate: [SubscriptionGuard],
        data: {
            requiresSubscription: true,
            minTier: 'basic'
        } as SubscriptionGuardData
    },
    {
        path: 'analytics',
        // component: AnalyticsComponent,
        canActivate: [SubscriptionGuard],
        data: {
            requiresSubscription: true,
            requiredFeatures: ['analytics'],
            minTier: 'pro'
        } as SubscriptionGuardData
    },
    {
        path: 'billing',
        // component: BillingComponent,
        canActivate: [SubscriptionGuard],
        data: {
            requiresSubscription: false // Allow access to billing page even without subscription
        } as SubscriptionGuardData
    },
    {
        path: 'settings',
        // component: SettingsComponent,
        canActivate: [SubscriptionGuard],
        data: {
            requiresSubscription: true,
            minTier: 'basic',
            allowGracePeriod: true
        } as SubscriptionGuardData
    },
    {
        path: 'admin',
        // component: AdminComponent,
        canActivate: [SubscriptionGuard],
        data: {
            requiresSubscription: true,
            requiredFeatures: ['admin_access', 'advanced_permissions'],
            minTier: 'enterprise',
            allowGracePeriod: false
        } as SubscriptionGuardData
    },
    {
        path: 'public-feature',
        // component: PublicFeatureComponent,
        canActivate: [SubscriptionGuard],
        data: {
            requiresSubscription: false
        } as SubscriptionGuardData
    }
];

/**
 * Example of how to extract and display guard messages in components
 * 
 * This can be used in your billing or upgrade components to show
 * contextual messages to users when they're redirected due to subscription issues.
 */
export class SubscriptionMessageExample {
    constructor() {
        // Example of retrieving and displaying guard messages
        const message = sessionStorage.getItem('subscriptionGuardMessage');
        if (message) {
            // Display the message to the user (e.g., in a toast or alert)
            console.log('Subscription message:', message);

            // Clear the message after displaying
            sessionStorage.removeItem('subscriptionGuardMessage');
        }
    }
}

/**
 * Example of how to handle query parameters from guard redirects
 * 
 * When users are redirected for upgrades, the guard adds query parameters
 * that can be used to customize the upgrade experience.
 */
export class SubscriptionRedirectExample {
    constructor() {
        // Example of handling upgrade redirect parameters
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('upgrade') === 'true') {
            const requiredTier = urlParams.get('required_tier');
            const requiredFeatures = urlParams.get('required_features');
            const reason = urlParams.get('reason');

            // Customize the upgrade experience based on these parameters
            console.log('Upgrade required:', { requiredTier, requiredFeatures, reason });

            // You could:
            // - Highlight the required plan tier
            // - Show specific features they need
            // - Display contextual upgrade messaging
        }
    }
}