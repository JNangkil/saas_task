## ADDED Requirements

### Requirement: List Tenants Endpoint
The system SHALL provide an endpoint to list all tenants.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/super-admin/tenants | List all tenants |

**Query Parameters:**
- search: Filter by name/slug
- status: active, disabled
- plan: Filter by plan code
- page, per_page: Pagination

#### Scenario: List tenants
- **WHEN** super admin requests tenants
- **THEN** paginated list is returned

---

### Requirement: Tenant Detail Endpoint
The system SHALL provide tenant detail view.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/super-admin/tenants/{tenant} | Get tenant details |

**Response includes:**
- Tenant info (name, slug, owner, created_at)
- Subscription status
- Usage counts (users, workspaces, boards, tasks)

#### Scenario: Get tenant details
- **WHEN** super admin requests tenant
- **THEN** full details returned

---

### Requirement: Enable/Disable Tenant
The system SHALL allow enabling/disabling tenants.

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /api/super-admin/tenants/{tenant}/status | Update status |

#### Scenario: Disable tenant
- **WHEN** super admin disables tenant
- **THEN** tenant users cannot access app

#### Scenario: Enable tenant
- **WHEN** super admin enables tenant
- **THEN** access is restored

---

### Requirement: Subscription Management
The system SHALL allow manual subscription changes.

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /api/super-admin/tenants/{tenant}/subscription | Update subscription |

#### Scenario: Change tenant plan
- **WHEN** super admin changes plan
- **THEN** subscription is updated
- **AND** action is logged

---

### Requirement: Tenants List UI
The Angular application SHALL display tenant list.

#### Scenario: Display tenants table
- **WHEN** super admin opens tenants page
- **THEN** table with tenants is displayed

#### Scenario: Search tenants
- **WHEN** search query entered
- **THEN** tenants are filtered

---

### Requirement: Tenant Detail UI
The Angular application SHALL display tenant details.

#### Scenario: View tenant details
- **WHEN** super admin clicks tenant
- **THEN** detail page shows full info

#### Scenario: Status actions
- **WHEN** on tenant detail page
- **THEN** enable/disable buttons available
