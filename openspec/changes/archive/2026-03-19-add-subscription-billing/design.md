# Design: Subscription & Billing

## Context

This design documents the technical architecture for implementing subscription billing in the multi-tenant SaaS task manager. The system must support:
- Multiple pricing tiers with different feature limits
- Integration with external payment providers
- Subscription lifecycle management
- Runtime enforcement of plan limits

**Dependencies**: Requires `add-multi-tenant-workspace` for Tenant entity.

## Goals / Non-Goals

### Goals
- Implement flexible plan-based feature gating
- Integrate with payment providers via webhook-driven architecture
- Provide self-service billing management for tenant owners
- Handle payment failures gracefully with grace periods
- Maintain complete audit trail of billing events

### Non-Goals
- Multi-currency support (single currency per plan for v1)
- Usage-based billing / metered pricing
- Complex proration calculations (rely on provider)
- Invoice generation (use provider invoices)
- Tax calculation (rely on provider)

## Decisions

### D1: Provider-Agnostic Integration Pattern

**Decision**: Use an adapter pattern for payment provider integration.

```php
interface BillingProviderInterface
{
    public function createCheckoutSession(Tenant $tenant, Plan $plan, string $billingCycle): CheckoutSession;
    public function createCustomerPortalSession(Tenant $tenant): PortalSession;
    public function cancelSubscription(string $externalSubscriptionId): void;
    public function changeSubscription(string $externalSubscriptionId, Plan $newPlan): void;
    public function verifyWebhookSignature(Request $request): bool;
    public function parseWebhookEvent(Request $request): WebhookEvent;
}
```

**Rationale**:
- Allows switching providers without code changes
- Enables testing with mock provider
- Stripe is default implementation

### D2: Subscription State Machine

**Decision**: Use explicit states with well-defined transitions.

```
                    ┌───────────────┐
        ┌──────────►│   trialing    │
        │           └───────┬───────┘
        │                   │ trial ends / checkout complete
        │                   ▼
        │           ┌───────────────┐
        │           │    active     │◄────────────┐
        │           └───────┬───────┘             │
        │                   │ payment fails       │ payment succeeds
        │                   ▼                     │
        │           ┌───────────────┐             │
        │           │   past_due    │─────────────┘
        │           └───────┬───────┘
        │                   │ grace period ends
        │                   ▼
        │           ┌───────────────┐
new     │           │    expired    │
tenant──┘           └───────────────┘
                            ▲
        ┌───────────────┐   │ immediate if no grace
        │   cancelled   │───┘
        └───────────────┘
              ▲
              │ user cancels (at period end)
              │
        ──────┴─── from active/trialing
```

**States**:
| State | Description | Access |
|-------|-------------|--------|
| trialing | Free trial period | Full access |
| active | Paid and current | Full access |
| past_due | Payment failed, in grace | Limited access |
| cancelled | User cancelled, active until period end | Full until period end |
| expired | No active subscription | Read-only / disabled |

### D3: Feature Limits Schema

**Decision**: Store feature limits as JSON with standardized keys.

```json
{
  "max_users": 5,
  "max_workspaces": 3,
  "max_boards_per_workspace": 10,
  "max_storage_gb": 5,
  "features": {
    "analytics": false,
    "api_access": false,
    "custom_fields": true,
    "integrations": false
  }
}
```

**Rationale**:
- Flexible for adding new limits
- Easy to compare usage vs limits
- Boolean features for on/off gating

### D4: Checkout Flow Architecture

**Decision**: Server-side checkout session with client redirect.

```
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌──────────────┐
│ Angular │     │ Laravel │     │   Provider  │     │   Webhook    │
└────┬────┘     └────┬────┘     └──────┬──────┘     └──────┬───────┘
     │               │                 │                   │
     │ POST checkout │                 │                   │
     │──────────────►│                 │                   │
     │               │ create session  │                   │
     │               │────────────────►│                   │
     │               │◄────────────────│                   │
     │◄──────────────│ session URL     │                   │
     │               │                 │                   │
     │ redirect      │                 │                   │
     │──────────────────────────────►─│                   │
     │               │                 │ (user pays)       │
     │               │                 │                   │
     │◄──────────────────────────────────────────────────│
     │ redirect to success  │         │ webhook event     │
     │               │                 │──────────────────►│
     │               │                 │      subscription_created
     │               │◄────────────────────────────────────│
     │               │ update subscription                 │
```

**Rationale**:
- Secure (no payment info touches our servers)
- PCI compliant
- Provider handles payment UI/UX

### D5: Webhook Security

**Decision**: Verify webhook signatures and implement idempotency.

```php
public function handleWebhook(Request $request)
{
    // 1. Verify signature
    if (!$this->provider->verifyWebhookSignature($request)) {
        return response('Invalid signature', 400);
    }
    
    // 2. Check idempotency
    $eventId = $request->header('X-Event-Id');
    if (SubscriptionEvent::where('external_event_id', $eventId)->exists()) {
        return response('Already processed', 200);
    }
    
    // 3. Process event
    $event = $this->provider->parseWebhookEvent($request);
    $this->processEvent($event);
    
    // 4. Log event
    SubscriptionEvent::create([...]);
    
    return response('OK', 200);
}
```

**Rationale**:
- Prevents replay attacks
- Handles duplicate webhook deliveries
- Complete audit trail

### D6: Database Schema

```
┌──────────────────┐
│      plans       │
├──────────────────┤
│ id (PK)          │
│ code (unique)    │─────────────────────┐
│ name             │                     │
│ price_monthly    │                     │
│ price_yearly     │                     │
│ currency         │                     │
│ feature_limits   │ (JSON)              │
│ trial_days       │                     │
│ status           │                     │
│ sort_order       │                     │
│ created_at       │                     │
│ updated_at       │                     │
└──────────────────┘                     │
                                         │
┌──────────────────┐                     │
│  subscriptions   │                     │
├──────────────────┤                     │
│ id (PK)          │                     │
│ tenant_id (FK)   │◄─────┐              │
│ plan_id (FK)     │──────┼──────────────┘
│ status           │      │
│ billing_period_  │      │
│    start         │      │
│ billing_period_  │      │
│    end           │      │
│ trial_ends_at    │      │
│ cancel_at        │      │
│ cancelled_at     │      │
│ external_        │      │
│    customer_id   │      │
│ external_        │      │
│    subscription_ │      │
│    id            │      │
│ created_at       │      │
│ updated_at       │      │
└────────┬─────────┘      │
         │                │
         │                │
         ▼                │
┌──────────────────┐      │
│subscription_     │      │
│     events       │      │
├──────────────────┤      │
│ id (PK)          │      │
│ subscription_id  │──────┘
│ tenant_id (FK)   │
│ event_type       │
│ payload          │ (JSON)
│ external_event_id│
│ processed_at     │
│ created_at       │
└──────────────────┘
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook delivery failures | Medium | Retry handling by provider; manual reconciliation |
| Race conditions on limit checks | Low | Optimistic locking; slight over-provision acceptable |
| Provider API downtime | Medium | Queue checkout requests; show "try again" |
| Data sync issues | Medium | Periodic reconciliation job; audit logs |

## Migration Plan

### Phase 1: Database & Models
1. Create migrations and models
2. Seed default plans
3. Create free subscription for existing tenants

### Phase 2: Backend API
1. Implement plan endpoints
2. Implement subscription endpoints
3. Configure webhook endpoint

### Phase 3: Provider Integration
1. Configure provider credentials
2. Test checkout flow in sandbox
3. Implement webhook handlers

### Phase 4: Frontend
1. Build pricing page
2. Build billing settings
3. Implement limit enforcement UI

### Rollback Strategy
- Feature flag for billing enforcement
- Existing tenants grandfather on free plan
- Provider subscriptions can be cancelled independently

## Open Questions

1. **Default plan for new tenants**: Free plan or immediate trial?
   - *Proposed*: 14-day trial of Pro plan, then downgrade to Free

2. **Grace period duration**: How long before blocking access?
   - *Proposed*: 7 days with email warnings at 1, 3, 7 days

3. **Grandfathering**: How to handle existing tenants when prices change?
   - *Proposed*: Lock in price at subscription time until change
