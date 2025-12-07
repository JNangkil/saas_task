## ADDED Requirements

### Requirement: Plan Entity
The system SHALL provide a Plan entity representing subscription tiers available to tenants. Each Plan SHALL have the following attributes:
- **id**: Unique identifier (UUID or auto-increment)
- **code**: Unique plan identifier (e.g., "free", "starter", "pro", "enterprise")
- **name**: Display name (e.g., "Free", "Starter", "Pro", "Enterprise")
- **price_monthly**: Monthly price in smallest currency unit (cents)
- **price_yearly**: Yearly price in smallest currency unit (cents)
- **currency**: ISO currency code (e.g., "USD")
- **feature_limits**: JSON object defining plan limits
- **trial_days**: Number of trial days (0 for no trial)
- **status**: Plan availability (active, inactive)
- **sort_order**: Display order on pricing page
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### Scenario: Create a subscription plan
- **WHEN** an administrator creates a plan with code "pro", price_monthly 2999, price_yearly 29990
- **THEN** the system creates a Plan record
- **AND** the yearly price reflects approximately 2 months free

#### Scenario: Plan code uniqueness
- **WHEN** an attempt is made to create a plan with code "pro" that already exists
- **THEN** the system returns a validation error

---

### Requirement: Plan Feature Limits Schema
The system SHALL define feature limits using a standardized JSON schema:

```json
{
  "max_users": 5,
  "max_workspaces": 3,
  "max_boards_per_workspace": 10,
  "max_storage_gb": 5,
  "max_tasks_per_board": 1000,
  "features": {
    "analytics": false,
    "api_access": false,
    "custom_fields": true,
    "integrations": false,
    "audit_logs": false,
    "priority_support": false
  }
}
```

#### Scenario: Define plan limits
- **WHEN** a plan is created with feature_limits setting max_users to 10
- **THEN** tenants on this plan can have at most 10 workspace members

#### Scenario: Boolean feature gating
- **WHEN** a plan has features.analytics set to false
- **THEN** analytics features are disabled for tenants on this plan

---

### Requirement: Default Plans Configuration
The system SHALL provide the following default plans:

| Code | Name | Monthly | Yearly | Users | Workspaces | Storage |
|------|------|---------|--------|-------|------------|---------|
| free | Free | $0 | $0 | 3 | 1 | 500MB |
| starter | Starter | $9 | $90 | 10 | 3 | 5GB |
| pro | Pro | $29 | $290 | 25 | 10 | 25GB |
| enterprise | Enterprise | $99 | $990 | Unlimited | Unlimited | 100GB |

#### Scenario: Seed default plans
- **WHEN** the application is initialized
- **THEN** default plans are seeded if they don't exist
- **AND** plans are ordered by sort_order for display

---

### Requirement: Plan API Endpoints
The system SHALL expose REST API endpoints for plan retrieval.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/plans | No | List all active plans |
| GET | /api/plans/{code} | No | Get plan details by code |

#### Scenario: List active plans (public)
- **WHEN** any user requests GET /api/plans
- **THEN** the system returns a list of plans with status "active"
- **AND** plans are ordered by sort_order
- **AND** inactive plans are excluded

**Response Payload (GET /api/plans):**
```json
{
  "data": [
    {
      "code": "free",
      "name": "Free",
      "price_monthly": 0,
      "price_yearly": 0,
      "currency": "USD",
      "trial_days": 0,
      "feature_limits": {
        "max_users": 3,
        "max_workspaces": 1,
        "max_storage_gb": 0.5,
        "features": {
          "analytics": false,
          "api_access": false
        }
      }
    },
    {
      "code": "starter",
      "name": "Starter",
      "price_monthly": 900,
      "price_yearly": 9000,
      "currency": "USD",
      "trial_days": 14,
      "feature_limits": {...}
    }
  ]
}
```

#### Scenario: Get plan details
- **WHEN** a request is made to GET /api/plans/pro
- **THEN** the system returns the full plan details
- **AND** includes feature comparison flags

#### Scenario: Plan not found
- **WHEN** a request is made to GET /api/plans/nonexistent
- **THEN** the system returns HTTP 404 Not Found

---

### Requirement: Plan Comparison Features
The system SHALL support plan comparison for the pricing page.

#### Scenario: Get plan comparison
- **WHEN** a request is made to GET /api/plans?include=comparison
- **THEN** the response includes a feature comparison matrix
- **AND** each feature shows availability across all plans

**Response with Comparison:**
```json
{
  "data": [...],
  "comparison": {
    "features": [
      {
        "key": "analytics",
        "label": "Advanced Analytics",
        "plans": {
          "free": false,
          "starter": false,
          "pro": true,
          "enterprise": true
        }
      },
      {
        "key": "max_users",
        "label": "Team Members",
        "plans": {
          "free": "3",
          "starter": "10",
          "pro": "25",
          "enterprise": "Unlimited"
        }
      }
    ]
  }
}
```
