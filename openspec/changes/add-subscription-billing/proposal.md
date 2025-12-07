# Change: Add Subscription & Billing

## Why

The multi-tenant SaaS task manager requires a billing system to:
- Monetize the platform through subscription plans with different tiers
- Enforce feature limits based on subscription level (users, workspaces, storage)
- Handle payment lifecycle events (trials, renewals, failures, cancellations)
- Provide self-service billing management for tenant owners

This feature is essential for the business model and completes the SaaS feature set.

## What Changes

### Subscription Plans
- **Plan entity**: centrally managed subscription tiers with pricing, features, and limits
- **Feature limits**: JSON-based configuration for max users, workspaces, storage, etc.
- **Billing cycles**: Support for monthly and yearly pricing with different rates

### Tenant Subscriptions
- **Subscription entity**: Links tenant to plan with billing state management
- **State machine**: trialing → active → past_due → cancelled/expired
- **External integration**: Generic payment provider interface (Stripe-compatible)

### Backend (Laravel)
- Webhook endpoint for payment provider callbacks
- Checkout session creation for secure payment flow
- Runtime limit enforcement middleware
- Grace period handling for failed payments

### Frontend (Angular)
- Public pricing page with plan comparison
- Billing settings page for tenant owners
- Trial/upgrade banners and prompts
- Subscription status guards

## Impact

### Affected Specs (New Capabilities)
- `subscription-plans`: Plan definitions, pricing, features
- `tenant-subscriptions`: Subscription lifecycle, webhooks, limits
- `billing-ui`: Angular components for billing management

### Dependencies
- Requires `add-multi-tenant-workspace` change (Tenant entity)
- Requires payment gateway account (Stripe, Paddle, etc.)
- Requires email delivery for billing notifications

### Affected Code Areas
- **Database**: New `plans`, `subscriptions`, `subscription_events` tables
- **Models**: Plan, Subscription, SubscriptionEvent
- **Controllers**: PlanController, SubscriptionController, WebhookController
- **Middleware**: SubscriptionLimitMiddleware
- **Services**: BillingService (Angular), PlanService (Angular)
- **Components**: PricingPage, BillingSettings, UpgradeBanner
