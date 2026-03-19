## ADDED Requirements

### Requirement: Super Admin Role
The system SHALL support a super admin role for platform management.

#### Scenario: Super admin flag
- **WHEN** user has is_super_admin = true
- **THEN** they can access super admin features

#### Scenario: Regular user blocked
- **WHEN** user without super admin flag accesses super admin routes
- **THEN** HTTP 403 Forbidden

---

### Requirement: Super Admin Middleware
The system SHALL protect super admin routes with middleware.

#### Scenario: Middleware check
- **WHEN** request to /api/super-admin routes
- **THEN** middleware verifies is_super_admin flag

---

### Requirement: Super Admin Login
The system SHALL allow super admin login via standard auth.

#### Scenario: Login as super admin
- **WHEN** super admin user logs in
- **THEN** token includes super admin claims

---

### Requirement: Tenant Impersonation
The system SHALL allow super admin to impersonate tenant owners.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/super-admin/tenants/{tenant}/impersonate | Start impersonation |

#### Scenario: Start impersonation
- **WHEN** super admin requests impersonation
- **THEN** temporary token for tenant owner is returned

#### Scenario: Impersonation logging
- **WHEN** impersonation starts
- **THEN** action is logged to audit

#### Scenario: Token expiration
- **WHEN** impersonation token is used
- **THEN** expires after 1 hour

---

### Requirement: Super Admin Audit Log
The system SHALL log all super admin actions.

**super_admin_audit_logs table:**
- id: UUID primary key
- admin_id: FK to super admin user
- action: Action type string
- entity_type: Affected entity type
- entity_id: Affected entity ID
- metadata: JSON with details
- created_at: Timestamp

#### Scenario: Log action
- **WHEN** super admin performs action
- **THEN** audit log entry is created

---

### Requirement: Super Admin Angular Guard
The Angular application SHALL protect super admin routes.

#### Scenario: Guard check
- **WHEN** user navigates to super admin
- **THEN** guard verifies super admin status
