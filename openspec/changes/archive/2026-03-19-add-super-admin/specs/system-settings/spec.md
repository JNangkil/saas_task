## ADDED Requirements

### Requirement: System Metrics Endpoint
The system SHALL provide global system metrics.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/super-admin/system/metrics | Get system metrics |

**Metrics returned:**
- total_tenants, total_users, total_workspaces
- total_boards, total_tasks
- daily_signups, weekly_signups
- mrr, arr, tenants_by_plan

#### Scenario: Get system metrics
- **WHEN** super admin requests metrics
- **THEN** global statistics returned

---

### Requirement: System Settings Endpoints
The system SHALL manage global settings.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/super-admin/settings | Get all settings |
| PATCH | /api/super-admin/settings | Update settings |

#### Scenario: Get settings
- **WHEN** super admin requests settings
- **THEN** grouped settings returned

#### Scenario: Update settings
- **WHEN** super admin updates setting
- **THEN** value is saved

---

### Requirement: Plan Management Endpoints
The system SHALL manage subscription plans.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/super-admin/plans | List plans |
| POST | /api/super-admin/plans | Create plan |
| PATCH | /api/super-admin/plans/{plan} | Update plan |
| DELETE | /api/super-admin/plans/{plan} | Delete plan |

#### Scenario: Create plan
- **WHEN** super admin creates plan
- **THEN** plan is saved with features

#### Scenario: Update plan
- **WHEN** super admin updates plan
- **THEN** changes apply to new subscriptions

---

### Requirement: Error Logs Endpoint
The system SHALL expose error log summary.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/super-admin/system/logs | Get error logs |

#### Scenario: View error logs
- **WHEN** super admin requests logs
- **THEN** recent errors with details returned

---

### Requirement: System Dashboard UI
The Angular application SHALL display system dashboard.

#### Scenario: Show metric cards
- **WHEN** dashboard loads
- **THEN** key metrics displayed in cards

#### Scenario: Show signup trends
- **WHEN** dashboard loads
- **THEN** signup chart displayed

---

### Requirement: Settings UI
The Angular application SHALL provide settings management.

#### Scenario: Display settings form
- **WHEN** super admin opens settings
- **THEN** grouped settings are editable

#### Scenario: Save settings
- **WHEN** super admin saves settings
- **THEN** changes are persisted
