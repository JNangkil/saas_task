# Design: Super Admin Panel

## Context

This design documents the architecture for a platform-level admin panel accessible only to super admins.

## Goals / Non-Goals

### Goals
- Complete tenant oversight and management
- Subscription and revenue visibility
- Global configuration management
- Impersonation for support

### Non-Goals
- Customer-facing admin features
- Tenant self-service billing portal
- Automated tenant provisioning

## Decisions

### D1: Super Admin Role

**Decision**: Boolean flag on users table for super admin.

```sql
ALTER TABLE users ADD is_super_admin BOOLEAN DEFAULT FALSE;
```

**Rationale**:
- Simple and efficient
- No complex role hierarchy needed
- Super admins are platform operators, not tenants

### D2: API Prefix and Middleware

**Decision**: All super admin routes under /api/super-admin prefix with dedicated middleware.

```php
Route::prefix('super-admin')
    ->middleware(['auth:api', 'super-admin'])
    ->group(function () {
        // All super admin routes
    });
```

### D3: Tenant Impersonation

**Flow:**
1. Super admin requests impersonation
2. System generates temporary token for tenant owner
3. Super admin uses token to access tenant context
4. All actions logged with impersonation flag
5. Token expires after 1 hour

### D4: System Settings Storage

**Decision**: Key-value settings table.

```sql
CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSON NOT NULL,
    updated_at TIMESTAMP
);
```

**Categories:**
- email.* (email provider config)
- payment.* (Stripe keys)
- storage.* (S3 config)
- defaults.* (trial days, default plan)
- features.* (feature flags)

### D5: Audit Log Structure

```sql
CREATE TABLE super_admin_audit_logs (
    id UUID PRIMARY KEY,
    admin_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSON,
    created_at TIMESTAMP
);
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Security breach | Critical | Strong auth, audit logging |
| Impersonation abuse | High | Time limits, full logging |
