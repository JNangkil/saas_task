## ADDED Requirements

### Requirement: Pricing Page Component
The Angular application SHALL provide a public PricingPageComponent for displaying subscription plans.

#### Scenario: Display pricing grid
- **WHEN** a user navigates to /pricing
- **THEN** a comparison grid shows all active plans
- **AND** each plan card displays:
  - Plan name and description
  - Monthly and yearly pricing options
  - Key feature list with checkmarks
  - CTA button ("Get Started" / "Upgrade")

#### Scenario: Toggle billing cycle
- **WHEN** a user toggles between "Monthly" and "Yearly"
- **THEN** prices update to reflect selected cycle
- **AND** yearly discount percentage is highlighted

#### Scenario: Highlight recommended plan
- **WHEN** the pricing page loads
- **THEN** the "Pro" plan (or configured default) is visually highlighted
- **AND** shows "Most Popular" badge

#### Scenario: CTA based on auth state
- **WHEN** an unauthenticated user clicks "Get Started"
- **THEN** they are directed to signup with plan pre-selected
- **WHEN** an authenticated user clicks "Upgrade"
- **THEN** checkout flow begins

---

### Requirement: Billing Settings Component
The Angular application SHALL provide a BillingSettingsComponent for tenant billing management.

#### Scenario: Display current subscription
- **WHEN** a tenant owner navigates to /settings/billing
- **THEN** the page displays:
  - Current plan name and price
  - Subscription status badge (active, trialing, etc.)
  - Billing cycle (monthly/yearly)
  - Next renewal date
  - Payment method summary (if available via portal link)

#### Scenario: Display usage meters
- **WHEN** the billing page loads
- **THEN** usage meters show:
  - Team Members: X of Y used (progress bar)
  - Workspaces: X of Y used (progress bar)
  - Storage: X GB of Y GB used (progress bar)
- **AND** meters change color when approaching limits (>80% yellow, >95% red)

#### Scenario: Change plan action
- **WHEN** owner clicks "Change Plan"
- **THEN** a plan selector modal opens
- **AND** shows available plans with current plan highlighted
- **AND** indicates upgrade vs downgrade
- **AND** shows proration estimate if available

#### Scenario: Upgrade flow
- **WHEN** owner selects a higher-tier plan and confirms
- **THEN** a checkout session is created
- **AND** user is redirected to payment provider
- **AND** on success, returns to billing page with updated plan

#### Scenario: Downgrade flow
- **WHEN** owner selects a lower-tier plan
- **THEN** system checks if current usage fits new limits
- **IF** usage exceeds limits
- **THEN** show error with required actions
- **ELSE** schedule downgrade for period end

#### Scenario: Cancel subscription
- **WHEN** owner clicks "Cancel Subscription"
- **THEN** a confirmation modal appears with:
  - Warning about access loss
  - Date when access ends
  - Optional feedback form
  - "Cancel Subscription" and "Keep My Plan" buttons

#### Scenario: Resume cancelled subscription
- **WHEN** owner has cancelled subscription (before period end)
- **THEN** "Resume Subscription" button is shown
- **AND** clicking it reactivates the subscription

---

### Requirement: Billing Angular Service
The Angular application SHALL provide a BillingService for subscription operations.

```typescript
interface ISubscription {
  id: string;
  plan: IPlan;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  billing_period_start: string;
  billing_period_end: string;
  trial_ends_at?: string;
  cancel_at?: string;
  usage: IUsageSummary;
}

interface IUsageSummary {
  users: { current: number; limit: number; percentage: number };
  workspaces: { current: number; limit: number; percentage: number };
  storage_gb: { current: number; limit: number; percentage: number };
}

interface ICheckoutResponse {
  checkout_url: string;
  session_id: string;
}
```

#### Scenario: BillingService methods
- **WHEN** the service is used
- **THEN** it provides:
  - getSubscription(): Observable<ISubscription>
  - createCheckoutSession(planCode, billingCycle, urls): Observable<ICheckoutResponse>
  - changePlan(planCode, billingCycle): Observable<ISubscription>
  - cancelSubscription(reason?, feedback?): Observable<void>
  - resumeSubscription(): Observable<ISubscription>
  - getUsage(): Observable<IUsageSummary>

---

### Requirement: Plan Angular Service
The Angular application SHALL provide a PlanService for plan retrieval.

```typescript
interface IPlan {
  code: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  trial_days: number;
  feature_limits: IFeatureLimits;
}

interface IFeatureLimits {
  max_users: number;
  max_workspaces: number;
  max_storage_gb: number;
  features: Record<string, boolean>;
}
```

#### Scenario: PlanService methods
- **WHEN** the service is used
- **THEN** it provides:
  - getPlans(): Observable<IPlan[]>
  - getPlan(code): Observable<IPlan>
  - getComparison(): Observable<IPlanComparison>

---

### Requirement: Trial Banner Component
The Angular application SHALL display a trial banner for trialing subscriptions.

#### Scenario: Display trial remaining
- **WHEN** subscription status is "trialing"
- **THEN** a banner appears at top of app showing:
  - "X days left in your trial"
  - "Upgrade Now" button
- **AND** banner is dismissible but reappears on page navigation

#### Scenario: Trial expiring soon
- **WHEN** trial has 3 or fewer days remaining
- **THEN** banner becomes more prominent (warning color)
- **AND** shows countdown

---

### Requirement: Past Due Banner Component
The Angular application SHALL display a warning banner for past_due subscriptions.

#### Scenario: Display payment failure warning
- **WHEN** subscription status is "past_due"
- **THEN** a prominent warning banner appears:
  - "Payment failed. Please update your payment method."
  - "X days remaining to resolve before access is restricted"
  - "Update Payment" button

#### Scenario: Grace period countdown
- **WHEN** past_due with 3 or fewer grace days
- **THEN** banner shows urgent styling
- **AND** countdown is prominent

---

### Requirement: Upgrade Prompt Component
The Angular application SHALL show upgrade prompts when approaching limits.

#### Scenario: Approaching limit prompt
- **WHEN** a resource usage exceeds 80% of limit
- **THEN** a subtle prompt appears near the relevant feature:
  - "You're using 8 of 10 team members. Upgrade for more."

#### Scenario: At limit prompt
- **WHEN** a user action would exceed a limit
- **THEN** a modal appears explaining:
  - Current limit and usage
  - Available plans with higher limits
  - "Upgrade" and "Cancel" buttons

---

### Requirement: Feature Gate Directive
The Angular application SHALL provide a directive for feature-based UI gating.

```html
<button *ifPlanHas="'analytics'">View Analytics</button>

<div *ifPlanLimit="'workspaces'; exceeds: 80">
  You're running low on workspaces!
</div>
```

#### Scenario: Hide feature button
- **WHEN** feature is not included in current plan
- **THEN** the element is hidden from DOM

#### Scenario: Show feature with upgrade prompt
- **WHEN** using *ifPlanHas="'analytics'; else: upgradePrompt"
- **THEN** shows upgrade prompt template instead of hiding

---

### Requirement: Subscription Guard
The Angular application SHALL provide route guards based on subscription status.

#### Scenario: Block feature route for free plan
- **WHEN** a Free plan user navigates to /analytics (requires analytics feature)
- **THEN** guard redirects to upgrade page
- **AND** displays message "Upgrade to Pro to access Analytics"

#### Scenario: Block all routes for expired subscription
- **WHEN** subscription status is "expired"
- **THEN** all routes except /settings/billing redirect to billing page
- **AND** shows "Your subscription has expired. Please renew to continue."

#### Scenario: Owner-only billing guard
- **WHEN** a non-owner navigates to /settings/billing
- **THEN** guard redirects to dashboard
- **AND** shows "Only workspace owner can manage billing"

---

### Requirement: Billing Error Handling
The Angular application SHALL handle billing-related errors gracefully.

#### Scenario: Handle 402 limit exceeded
- **WHEN** an API returns HTTP 402 (Payment Required)
- **THEN** an upgrade modal is shown
- **AND** displays the specific limit that was exceeded
- **AND** offers "Upgrade" and "Go Back" options

#### Scenario: Handle checkout failure
- **WHEN** checkout is cancelled or fails
- **THEN** redirect to billing page with error toast
- **AND** "Payment was not completed. Please try again."

#### Scenario: Handle webhook delay
- **WHEN** user returns from checkout before webhook processes
- **THEN** billing page shows "Processing your payment..."
- **AND** polls for subscription update
- **AND** refreshes when subscription activates

---

### Requirement: Checkout Flow Integration
The Angular application SHALL handle the checkout redirect flow.

#### Scenario: Initiate checkout
- **WHEN** user clicks "Upgrade to Pro"
- **THEN** BillingService.createCheckoutSession() is called
- **AND** loading state is shown
- **AND** on success, redirect to checkout_url

#### Scenario: Return from successful checkout
- **WHEN** user returns to success_url
- **THEN** billing page loads
- **AND** shows success toast "Welcome to Pro!"
- **AND** displays new subscription details

#### Scenario: Return from cancelled checkout
- **WHEN** user returns to cancel_url
- **THEN** billing page loads
- **AND** shows info toast "Checkout cancelled"
- **AND** no subscription changes made
