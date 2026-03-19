## ADDED Requirements

### Requirement: Subscription Entity
The system SHALL provide a Subscription entity linking a Tenant to a Plan. Each Subscription SHALL have the following attributes:
- **id**: Unique identifier
- **tenant_id**: Foreign key to tenant (required)
- **plan_id**: Foreign key to plan (required)
- **status**: Subscription state (trialing, active, past_due, cancelled, expired)
- **billing_cycle**: Billing frequency (monthly, yearly)
- **billing_period_start**: Current billing period start date
- **billing_period_end**: Current billing period end date
- **trial_ends_at**: Trial expiration timestamp (nullable)
- **cancel_at**: Scheduled cancellation timestamp (nullable)
- **cancelled_at**: Actual cancellation timestamp (nullable)
- **external_customer_id**: Payment provider customer ID
- **external_subscription_id**: Payment provider subscription ID
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### Scenario: Create subscription for new tenant
- **WHEN** a new tenant is created
- **THEN** a subscription is created with plan "free" and status "trialing" or "active"

#### Scenario: One active subscription per tenant
- **WHEN** a tenant already has an active subscription
- **THEN** only one subscription record exists with non-expired status
- **AND** historical subscriptions are preserved with expired status

---

### Requirement: Subscription Status States
The system SHALL manage subscription status with the following definitions:

| Status | Description | Access Level |
|--------|-------------|--------------|
| trialing | Free trial period active | Full access |
| active | Paid subscription current | Full access |
| past_due | Payment failed, in grace period | Limited (read + critical) |
| cancelled | User cancelled, active until period end | Full until period end |
| expired | Subscription ended, no active plan | Read-only / disabled |

#### Scenario: Trialing to active transition
- **WHEN** a trial subscription receives successful payment
- **THEN** status changes to "active"
- **AND** billing_period_start is set to current date

#### Scenario: Active to past_due transition
- **WHEN** a recurring payment fails
- **THEN** status changes to "past_due"
- **AND** grace period begins (7 days default)

#### Scenario: Past_due to expired transition
- **WHEN** grace period ends without successful payment
- **THEN** status changes to "expired"
- **AND** tenant access is restricted

#### Scenario: Cancelled status handling
- **WHEN** a user cancels their subscription
- **THEN** cancel_at is set to billing_period_end
- **AND** status remains "cancelled" until period end
- **AND** full access continues until period end

---

### Requirement: Subscription API Endpoints
The system SHALL expose REST API endpoints for subscription management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/tenants/{tenant}/subscription | Yes | Get current subscription |
| POST | /api/tenants/{tenant}/subscription/checkout-session | Yes | Create checkout session |
| POST | /api/tenants/{tenant}/subscription/change-plan | Yes | Change subscription plan |
| POST | /api/tenants/{tenant}/subscription/cancel | Yes | Cancel subscription |
| POST | /api/tenants/{tenant}/subscription/resume | Yes | Resume cancelled subscription |
| GET | /api/tenants/{tenant}/subscription/usage | Yes | Get current usage vs limits |

#### Scenario: Get current subscription (Owner only)
- **WHEN** a tenant owner requests GET /api/tenants/{tenant}/subscription
- **THEN** the system returns subscription details including:
  - Current plan with feature limits
  - Status and billing dates
  - Usage summary (users, workspaces, storage)

**Response Payload:**
```json
{
  "data": {
    "id": "uuid",
    "plan": {
      "code": "starter",
      "name": "Starter",
      "price_monthly": 900
    },
    "status": "active",
    "billing_cycle": "monthly",
    "billing_period_start": "2024-01-01",
    "billing_period_end": "2024-02-01",
    "cancel_at": null,
    "usage": {
      "users": { "current": 5, "limit": 10, "percentage": 50 },
      "workspaces": { "current": 2, "limit": 3, "percentage": 67 },
      "storage_gb": { "current": 1.2, "limit": 5, "percentage": 24 }
    }
  }
}
```

#### Scenario: Non-owner denied billing access
- **WHEN** a member (non-owner) requests subscription endpoints
- **THEN** the system returns HTTP 403 Forbidden
- **AND** only tenant owners can manage billing

---

### Requirement: Checkout Session Creation
The system SHALL create secure checkout sessions for plan purchases.

**Request Payload (POST /api/tenants/{tenant}/subscription/checkout-session):**
```json
{
  "plan_code": "pro",
  "billing_cycle": "yearly",
  "success_url": "https://app.example.com/billing?success=true",
  "cancel_url": "https://app.example.com/billing?cancelled=true"
}
```

**Response Payload:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_xxxx"
}
```

#### Scenario: Create checkout session
- **WHEN** a tenant owner requests a checkout session for plan "pro"
- **THEN** the system creates a session with the payment provider
- **AND** returns a URL for the user to complete payment

#### Scenario: Checkout with existing subscription (upgrade)
- **WHEN** a tenant with active subscription creates checkout for higher plan
- **THEN** the session is configured for plan upgrade
- **AND** proration is handled by the payment provider

#### Scenario: Checkout validation
- **WHEN** checkout request has invalid plan_code
- **THEN** the system returns HTTP 422 with validation error

**Validation Rules:**
| Field | Rules |
|-------|-------|
| plan_code | required, exists:plans,code, status is active |
| billing_cycle | required, in:monthly,yearly |
| success_url | required, url |
| cancel_url | required, url |

---

### Requirement: Plan Change Handling
The system SHALL support plan upgrades and downgrades.

**Request Payload (POST /api/tenants/{tenant}/subscription/change-plan):**
```json
{
  "plan_code": "enterprise",
  "billing_cycle": "yearly"
}
```

#### Scenario: Upgrade to higher plan
- **WHEN** a tenant on "starter" plan changes to "pro"
- **THEN** the change is processed immediately
- **AND** prorated charges are applied via payment provider

#### Scenario: Downgrade to lower plan
- **WHEN** a tenant on "pro" plan changes to "starter"
- **THEN** the change is scheduled for next billing period
- **AND** current plan remains active until period end

#### Scenario: Downgrade blocked by usage
- **WHEN** a tenant with 8 users tries to downgrade to a plan with max 5 users
- **THEN** the system returns HTTP 422 with error
- **AND** includes details: "Current usage exceeds new plan limits. Remove 3 users before downgrading."

---

### Requirement: Subscription Cancellation
The system SHALL support subscription cancellation with grace period.

**Request Payload (POST /api/tenants/{tenant}/subscription/cancel):**
```json
{
  "reason": "Too expensive",
  "feedback": "Would return if pricing was lower"
}
```

#### Scenario: Cancel subscription
- **WHEN** a tenant owner cancels their subscription
- **THEN** cancel_at is set to billing_period_end
- **AND** status changes to "cancelled"
- **AND** access continues until billing_period_end
- **AND** cancellation is logged for analytics

#### Scenario: Resume cancelled subscription
- **WHEN** a tenant owner resumes before period end
- **THEN** cancel_at is cleared
- **AND** status changes back to "active"
- **AND** subscription continues normally

---

### Requirement: Webhook Handling
The system SHALL handle payment provider webhook events.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/billing/webhook | Signature | Handle provider callbacks |

**Handled Events:**
| Event | Action |
|-------|--------|
| checkout.session.completed | Create/activate subscription |
| invoice.payment_succeeded | Update subscription active |
| invoice.payment_failed | Set subscription past_due |
| customer.subscription.updated | Sync subscription changes |
| customer.subscription.deleted | Set subscription expired |

#### Scenario: Webhook signature verification
- **WHEN** a webhook request arrives
- **THEN** the system verifies the provider signature
- **AND** rejects requests with invalid signatures (HTTP 400)

#### Scenario: Idempotent webhook processing
- **WHEN** a duplicate webhook is received
- **THEN** the system recognizes the external_event_id
- **AND** returns HTTP 200 without reprocessing

#### Scenario: Checkout completed webhook
- **WHEN** checkout.session.completed event is received
- **THEN** the system creates/updates the subscription
- **AND** sets status to "active"
- **AND** stores external_subscription_id

#### Scenario: Payment failed webhook
- **WHEN** invoice.payment_failed event is received
- **THEN** the subscription status changes to "past_due"
- **AND** email notification is sent to tenant owner
- **AND** grace period begins

---

### Requirement: Subscription Event Logging
The system SHALL log all subscription events for audit and debugging.

**SubscriptionEvent Attributes:**
- id, subscription_id, tenant_id
- event_type (checkout.completed, payment.succeeded, etc.)
- payload (full webhook payload JSON)
- external_event_id
- processed_at, created_at

#### Scenario: Log webhook event
- **WHEN** any webhook event is processed
- **THEN** a subscription_event record is created
- **AND** includes full payload for debugging

---

### Requirement: Limit Enforcement
The system SHALL enforce plan limits at runtime.

#### Scenario: User limit enforcement
- **WHEN** a tenant at user limit invites another user
- **THEN** the system returns HTTP 402 Payment Required
- **AND** error message: "User limit reached. Upgrade your plan to add more users."

#### Scenario: Workspace limit enforcement
- **WHEN** a tenant at workspace limit creates a new workspace
- **THEN** the system returns HTTP 402 Payment Required
- **AND** suggests upgrading

#### Scenario: Storage limit enforcement
- **WHEN** a file upload would exceed storage limit
- **THEN** the system returns HTTP 402 Payment Required
- **AND** includes current usage and limit

#### Scenario: Feature gating
- **WHEN** a tenant on Free plan accesses analytics feature (analytics: false)
- **THEN** the system returns HTTP 402 Payment Required
- **AND** indicates feature is not available on current plan

---

### Requirement: Grace Period Handling
The system SHALL implement grace period for payment failures.

#### Scenario: Past_due restrictions
- **WHEN** subscription is in past_due state
- **THEN** the following are restricted:
  - Creating new workspaces
  - Inviting new users
  - Uploading files
- **AND** existing data remains accessible
- **AND** critical actions (task updates) remain available

#### Scenario: Grace period expiration
- **WHEN** past_due grace period (7 days) expires without payment
- **THEN** subscription transitions to "expired"
- **AND** tenant is marked as disabled (data preserved)
- **AND** final notification email is sent

---

### Requirement: Tenant Disabled State
The system SHALL handle expired/disabled tenant state.

#### Scenario: Expired subscription access
- **WHEN** a tenant's subscription expires
- **THEN** all workspace members see "Subscription Expired" message
- **AND** only tenant owner can access billing page
- **AND** data is preserved but read-only

#### Scenario: Reactivate expired tenant
- **WHEN** tenant owner completes new checkout
- **THEN** subscription is reactivated
- **AND** full access is restored
