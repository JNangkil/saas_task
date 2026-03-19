## ADDED Requirements

### Requirement: Tenant Entity Management
The system SHALL provide a Tenant entity representing a company/organization using the SaaS platform. Each Tenant SHALL have the following attributes:
- **id**: Unique identifier (UUID or auto-increment)
- **name**: Company/organization display name (required, max 255 characters)
- **slug**: URL-safe subdomain identifier (required, unique, lowercase, max 63 characters)
- **logo_url**: Optional URL to company logo
- **billing_email**: Email for billing communications
- **settings**: JSON field for tenant-specific configuration
- **status**: Enum (active, suspended, deactivated)
- **locale**: Default language/locale (e.g., en_US)
- **timezone**: Default timezone (e.g., America/New_York)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### Scenario: Create a new tenant
- **WHEN** an administrator creates a new tenant with name "Acme Corp" and slug "acme"
- **THEN** the system creates a Tenant record with the provided details
- **AND** the system creates a default "General" workspace for the tenant
- **AND** the creating user is assigned as the tenant owner

#### Scenario: Prevent duplicate tenant slugs
- **WHEN** an administrator attempts to create a tenant with slug "acme" that already exists
- **THEN** the system returns a validation error indicating the slug is taken

#### Scenario: Update tenant settings
- **WHEN** a tenant owner updates the tenant name to "Acme Corporation"
- **THEN** the system updates the tenant record
- **AND** the updated_at timestamp is refreshed

---

### Requirement: Tenant Status Management
The system SHALL support tenant status transitions to control access and data retention.

#### Scenario: Deactivate a tenant
- **WHEN** a super admin deactivates a tenant
- **THEN** the tenant status changes to "deactivated"
- **AND** all users of that tenant receive access denied errors
- **AND** the tenant's data is preserved but inaccessible

#### Scenario: Reactivate a suspended tenant
- **WHEN** a super admin reactivates a suspended tenant
- **THEN** the tenant status changes to "active"
- **AND** users can access the tenant's workspaces and data

---

### Requirement: Tenant API Endpoints
The system SHALL expose REST API endpoints for tenant management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tenants | List tenants for current user |
| POST | /api/tenants | Create a new tenant |
| GET | /api/tenants/{id} | Get tenant details |
| PUT | /api/tenants/{id} | Update tenant |
| DELETE | /api/tenants/{id} | Deactivate tenant (soft delete) |

#### Scenario: List user's tenants
- **WHEN** an authenticated user requests GET /api/tenants
- **THEN** the system returns a paginated list of tenants the user belongs to
- **AND** each tenant includes id, name, slug, logo_url, and user's role

#### Scenario: Get tenant details with authorization
- **WHEN** a user requests GET /api/tenants/{id} for a tenant they don't belong to
- **THEN** the system returns HTTP 403 Forbidden

---

### Requirement: Tenant Request Validation
The system SHALL validate all tenant API requests using Laravel Form Request classes.

| Field | Rules |
|-------|-------|
| name | required, string, max:255 |
| slug | required, string, max:63, alpha_dash, unique:tenants |
| logo_url | nullable, url, max:2048 |
| billing_email | nullable, email, max:255 |
| locale | nullable, string, max:10 |
| timezone | nullable, timezone |

#### Scenario: Validate tenant creation request
- **WHEN** a request to create a tenant is missing the "name" field
- **THEN** the system returns HTTP 422 with validation error details

---

### Requirement: Tenant-User Association
The system SHALL maintain a many-to-many relationship between tenants and users through a `tenant_user` pivot table with the following attributes:
- **tenant_id**: Foreign key to tenants
- **user_id**: Foreign key to users  
- **role**: User's role within tenant (owner, admin, member)
- **invited_at**: Timestamp when user was invited
- **joined_at**: Timestamp when user accepted invitation

#### Scenario: Assign user to tenant
- **WHEN** a tenant admin invites a user to the tenant
- **THEN** a tenant_user record is created with role "member"
- **AND** invited_at is set to current timestamp

#### Scenario: User joins multiple tenants
- **WHEN** a user is invited to a second tenant
- **THEN** the user can switch between their tenants
- **AND** each tenant maintains separate workspace memberships
