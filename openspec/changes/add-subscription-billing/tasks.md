# Tasks: Add Subscription & Billing

## 1. Database Schema & Migrations

- [ ] 1.1 Create `plans` table (id, code, name, price_monthly, price_yearly, currency, feature_limits JSON, trial_days, status, sort_order, created_at, updated_at)
- [ ] 1.2 Create `subscriptions` table (id, tenant_id, plan_id, status, billing_period_start, billing_period_end, trial_ends_at, cancel_at, cancelled_at, external_customer_id, external_subscription_id, created_at, updated_at)
- [ ] 1.3 Create `subscription_events` table (id, subscription_id, tenant_id, event_type, payload JSON, external_event_id, processed_at, created_at)
- [ ] 1.4 Add indexes for tenant_id, plan_id, status, external IDs
- [ ] 1.5 Create default plans seeder (Free, Starter, Pro, Enterprise)

## 2. Laravel Models & Relationships

- [ ] 2.1 Create Plan model with feature limit accessors
- [ ] 2.2 Create Subscription model with status scopes and relationships
- [ ] 2.3 Create SubscriptionEvent model for audit logging
- [ ] 2.4 Update Tenant model with subscription relationship
- [ ] 2.5 Add model factories for testing

## 3. Subscription State Management

- [ ] 3.1 Define subscription status enum (trialing, active, past_due, cancelled, expired)
- [ ] 3.2 Implement state transition validation
- [ ] 3.3 Create subscription lifecycle events (Laravel Events)
- [ ] 3.4 Implement trial period handling

## 4. Payment Provider Integration

- [ ] 4.1 Create abstract BillingProvider interface
- [ ] 4.2 Implement Stripe provider adapter (or configurable default)
- [ ] 4.3 Create checkout session generation logic
- [ ] 4.4 Implement customer portal URL generation
- [ ] 4.5 Handle subscription creation from webhook

## 5. Laravel API Endpoints - Plans

- [ ] 5.1 Create PlanController with index, show methods
- [ ] 5.2 GET /api/plans (public - list active plans)
- [ ] 5.3 GET /api/plans/{code} (public - plan details)
- [ ] 5.4 Create PlanResource for API response formatting

## 6. Laravel API Endpoints - Subscriptions

- [ ] 6.1 Create SubscriptionController with show, checkout, changePlan, cancel
- [ ] 6.2 GET /api/tenants/{tenant}/subscription (current subscription)
- [ ] 6.3 POST /api/tenants/{tenant}/subscription/checkout-session (create checkout)
- [ ] 6.4 POST /api/tenants/{tenant}/subscription/change-plan (upgrade/downgrade)
- [ ] 6.5 POST /api/tenants/{tenant}/subscription/cancel (schedule cancellation)
- [ ] 6.6 GET /api/tenants/{tenant}/subscription/usage (current usage vs limits)
- [ ] 6.7 Create SubscriptionRequest validation classes
- [ ] 6.8 Implement owner-only authorization

## 7. Webhook Handling

- [ ] 7.1 Create WebhookController for billing provider callbacks
- [ ] 7.2 POST /api/billing/webhook (provider webhook endpoint)
- [ ] 7.3 Implement signature verification (provider-specific)
- [ ] 7.4 Handle events: checkout.completed, payment.succeeded, payment.failed, subscription.updated, subscription.deleted
- [ ] 7.5 Log all webhook events to subscription_events table
- [ ] 7.6 Implement idempotency for duplicate webhooks

## 8. Limit Enforcement

- [ ] 8.1 Create SubscriptionLimitMiddleware
- [ ] 8.2 Implement user limit checks (on user invite/create)
- [ ] 8.3 Implement workspace limit checks (on workspace create)
- [ ] 8.4 Implement storage limit checks (on file upload)
- [ ] 8.5 Return appropriate error responses when limits exceeded
- [ ] 8.6 Create LimitService for centralized limit checking

## 9. Grace Period & Disabled State

- [ ] 9.1 Implement past_due grace period (configurable, default 7 days)
- [ ] 9.2 Restrict non-essential features during past_due state
- [ ] 9.3 Auto-transition to expired after grace period
- [ ] 9.4 Mark tenant as disabled on expired (preserve data)
- [ ] 9.5 Send email notifications for payment failures

## 10. Angular Services

- [ ] 10.1 Create PlanService with API integration
- [ ] 10.2 Create BillingService for subscription operations
- [ ] 10.3 Implement checkout redirect flow
- [ ] 10.4 Create subscription state interface and types
- [ ] 10.5 Add subscription context to app state

## 11. Angular UI - Pricing Page

- [ ] 11.1 Create PricingPageComponent (public route /pricing)
- [ ] 11.2 Display plan comparison grid with features
- [ ] 11.3 Toggle between monthly/yearly pricing
- [ ] 11.4 Highlight recommended plan
- [ ] 11.5 "Get Started" / "Upgrade" CTAs based on auth state

## 12. Angular UI - Billing Settings

- [ ] 12.1 Create BillingSettingsComponent (route /settings/billing)
- [ ] 12.2 Display current plan, status, renewal date
- [ ] 12.3 Show usage meters (users: 3/10, workspaces: 2/5)
- [ ] 12.4 "Change Plan" button with plan selector modal
- [ ] 12.5 "Cancel Subscription" with confirmation workflow
- [ ] 12.6 "Manage Payment Method" link to provider portal
- [ ] 12.7 Billing history section (optional)

## 13. Angular UI - Banners & Prompts

- [ ] 13.1 Create TrialBannerComponent (shows days remaining)
- [ ] 13.2 Create UpgradePromptComponent for limit warnings
- [ ] 13.3 Create PastDueBannerComponent for payment issues
- [ ] 13.4 Integrate banners into layout based on subscription state
- [ ] 13.5 Create feature gate directive (*ifPlanHas)

## 14. Guards & Access Control

- [ ] 14.1 Create SubscriptionGuard for route protection
- [ ] 14.2 Implement feature-based route restrictions
- [ ] 14.3 Owner-only guard for billing settings
- [ ] 14.4 Handle expired subscription redirects

## 15. Testing & Validation

- [ ] 15.1 PHPUnit tests for Plan CRUD operations
- [ ] 15.2 PHPUnit tests for subscription state transitions
- [ ] 15.3 PHPUnit tests for webhook handling (mock provider)
- [ ] 15.4 PHPUnit tests for limit enforcement
- [ ] 15.5 Angular unit tests for BillingService
- [ ] 15.6 Angular unit tests for billing components
- [ ] 15.7 E2E test: trial → checkout → active → cancel flow
