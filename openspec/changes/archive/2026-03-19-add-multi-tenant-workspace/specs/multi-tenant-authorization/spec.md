## ADDED Requirements

### Requirement: Tenant Resolution Middleware
The system SHALL implement middleware that resolves the current tenant context for every authenticated request. Resolution SHALL follow this priority order:
1. Subdomain extraction (e.g., acme.taskapp.com → tenant: acme)
2. X-Tenant-ID header (for API clients)
3. tenant_id claim from JWT token

#### Scenario: Resolve tenant from subdomain
- **WHEN** a request arrives at acme.taskapp.com
- **THEN** the middleware extracts "acme" from the subdomain
- **AND** looks up the tenant by slug
- **AND** sets the tenant context for the request

#### Scenario: Resolve tenant from header
- **WHEN** a request includes header X-Tenant-ID: {uuid} and no subdomain
- **THEN** the middleware looks up the tenant by ID
- **AND** verifies the authenticated user belongs to that tenant
- **AND** sets the tenant context for the request

#### Scenario: Resolve tenant from JWT
- **WHEN** a request has no subdomain or header, but JWT contains tenant_id claim
- **THEN** the middleware uses the tenant_id from the JWT
- **AND** sets the tenant context for the request

#### Scenario: Reject request with no tenant context
- **WHEN** a request to a tenant-scoped route has no resolvable tenant
- **THEN** the system returns HTTP 400 with error "Tenant context required"

#### Scenario: Reject request for inactive tenant
- **WHEN** a resolved tenant has status "suspended" or "deactivated"
- **THEN** the system returns HTTP 403 with error "Tenant is not active"

---

### Requirement: Global Tenant Scoping
The system SHALL automatically apply tenant filtering to all database queries for tenant-scoped models using Laravel Global Scopes.

#### Scenario: Automatic query filtering
- **WHEN** any query is executed on a tenant-scoped model (Board, Task, etc.)
- **THEN** the query automatically includes WHERE tenant_id = {current_tenant_id}
- **AND** no cross-tenant data is ever returned

#### Scenario: Automatic tenant assignment on create
- **WHEN** a new record is created for a tenant-scoped model
- **THEN** the tenant_id is automatically set to the current tenant
- **AND** this happens before validation

#### Scenario: Super admin bypasses tenant scope
- **WHEN** a super admin performs administrative operations
- **THEN** queries can use withoutGlobalScope() to access all tenants
- **AND** this is logged for audit purposes

---

### Requirement: JWT Tenant Claims
The system SHALL include tenant context in JWT tokens for authenticated users.

#### Scenario: Include tenant in login token
- **WHEN** a user logs in and belongs to exactly one tenant
- **THEN** the JWT includes tenant_id and tenant_slug claims
- **AND** workspace_id if user has a default workspace

#### Scenario: Multi-tenant user login
- **WHEN** a user logs in and belongs to multiple tenants
- **THEN** the JWT includes a tenants array with id/slug/name for each
- **AND** the user must select a tenant before accessing tenant-scoped routes

#### Scenario: Switch tenant context
- **WHEN** a multi-tenant user switches to a different tenant
- **THEN** the system issues a new JWT with the selected tenant_id
- **AND** the previous token is invalidated for that session

---

### Requirement: Tenant-Level Authorization
The system SHALL enforce authorization rules ensuring users can only access resources within tenants they belong to.

#### Scenario: Deny access to non-member tenant
- **WHEN** a user attempts to access a resource in a tenant they don't belong to
- **THEN** the system returns HTTP 403 Forbidden
- **AND** logs the unauthorized access attempt

#### Scenario: Tenant role-based permissions
The system SHALL support the following tenant-level roles:
| Role | Permissions |
|------|-------------|
| owner | Full tenant management, billing, delete tenant |
| admin | Manage workspaces, invite users, manage settings |
| member | Access workspaces they're assigned to |

#### Scenario: Owner manages tenant settings
- **WHEN** a tenant owner updates billing email or tenant settings
- **THEN** the operation succeeds

#### Scenario: Member cannot manage tenant
- **WHEN** a tenant member attempts to update tenant settings
- **THEN** the system returns HTTP 403 Forbidden

---

### Requirement: Workspace-Level Authorization
The system SHALL enforce authorization rules at the workspace level.

#### Scenario: Workspace role-based permissions
The system SHALL support the following workspace-level roles:
| Role | Permissions |
|------|-------------|
| admin | Full workspace management, manage members, create boards |
| member | Create/edit tasks, view boards |
| viewer | Read-only access to boards and tasks |

#### Scenario: Deny access to non-member workspace
- **WHEN** a user attempts to access a board in a workspace they're not a member of
- **THEN** the system returns HTTP 403 Forbidden

#### Scenario: Viewer cannot create tasks
- **WHEN** a workspace viewer attempts to create a task
- **THEN** the system returns HTTP 403 Forbidden

#### Scenario: Member creates task in their workspace
- **WHEN** a workspace member creates a task
- **THEN** the operation succeeds
- **AND** the task is associated with the current workspace

---

### Requirement: Authorization Policies
The system SHALL implement Laravel Policies for fine-grained authorization on Tenant and Workspace models.

#### Scenario: TenantPolicy authorization
- **WHEN** a user action requires tenant authorization
- **THEN** TenantPolicy methods (view, update, delete, manageUsers) are evaluated
- **AND** the user's tenant role determines access

#### Scenario: WorkspacePolicy authorization
- **WHEN** a user action requires workspace authorization  
- **THEN** WorkspacePolicy methods (view, create, update, archive, delete, manageMembers) are evaluated
- **AND** the user's workspace role determines access
