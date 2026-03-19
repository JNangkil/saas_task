## ADDED Requirements

### Requirement: Tenant-Level Roles
The system SHALL support fixed roles at the tenant level.

| Role | Description |
|------|-------------|
| owner | Full tenant control, cannot be removed |
| admin | Manage users, workspaces, settings |
| billing | Manage subscription and payments |
| member | Basic access to assigned workspaces |

#### Scenario: Tenant owner permissions
- **WHEN** a user is tenant owner
- **THEN** they have all tenant permissions

#### Scenario: Only one owner
- **WHEN** transferring ownership
- **THEN** previous owner becomes admin

---

### Requirement: Workspace-Level Roles
The system SHALL support fixed roles at the workspace level.

| Role | Description |
|------|-------------|
| owner | Full workspace control |
| admin | Manage workspace, boards, members |
| member | Create and edit tasks, boards |
| viewer | Read-only access |

#### Scenario: Workspace viewer access
- **WHEN** a user is workspace viewer
- **THEN** they can view but not modify tasks

---

### Requirement: Tenant Permission Matrix
The system SHALL enforce tenant-level permissions.

| Permission | owner | admin | billing | member |
|------------|-------|-------|---------|--------|
| tenant.manage | Y | N | N | N |
| tenant.users.manage | Y | Y | N | N |
| tenant.users.invite | Y | Y | N | N |
| tenant.billing.manage | Y | N | Y | N |
| tenant.workspaces.create | Y | Y | N | N |
| tenant.settings.manage | Y | Y | N | N |
| tenant.analytics.view | Y | Y | Y | N |

#### Scenario: Admin manages users
- **WHEN** tenant admin manages users
- **THEN** action is allowed

#### Scenario: Member cannot manage users
- **WHEN** tenant member tries to manage users
- **THEN** HTTP 403 Forbidden is returned

---

### Requirement: Workspace Permission Matrix
The system SHALL enforce workspace-level permissions.

| Permission | owner | admin | member | viewer |
|------------|-------|-------|--------|--------|
| workspace.manage | Y | N | N | N |
| workspace.delete | Y | N | N | N |
| workspace.members.manage | Y | Y | N | N |
| workspace.members.invite | Y | Y | N | N |
| boards.create | Y | Y | Y | N |
| boards.manage | Y | Y | N | N |
| boards.delete | Y | Y | N | N |
| tasks.create | Y | Y | Y | N |
| tasks.edit | Y | Y | Y | N |
| tasks.delete | Y | Y | N | N |
| tasks.assign | Y | Y | Y | N |
| tasks.view | Y | Y | Y | Y |
| columns.manage | Y | Y | N | N |

#### Scenario: Member creates task
- **WHEN** workspace member creates a task
- **THEN** action is allowed

#### Scenario: Viewer cannot edit
- **WHEN** workspace viewer tries to edit task
- **THEN** HTTP 403 Forbidden is returned

---

### Requirement: Permission Enforcement
The system SHALL enforce permissions via policies and middleware.

#### Scenario: Policy authorization
- **WHEN** an action requires permission
- **THEN** Laravel Policy checks user permission

#### Scenario: Route middleware
- **WHEN** a route requires permission
- **THEN** permission middleware validates before controller

---

### Requirement: Tenant User Management API
The system SHALL expose API endpoints for managing tenant users.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tenants/{tenant}/users | List tenant users |
| PATCH | /api/tenants/{tenant}/users/{user} | Update role/status |
| DELETE | /api/tenants/{tenant}/users/{user} | Remove from tenant |

#### Scenario: List tenant users
- **WHEN** admin requests tenant users
- **THEN** list of users with roles is returned

#### Scenario: Change user role
- **WHEN** admin changes user role to billing
- **THEN** user role is updated

#### Scenario: Suspend user
- **WHEN** admin sets user status to inactive
- **THEN** user is suspended and cannot login

---

### Requirement: Permission Service
The system SHALL provide a PermissionService for checking access.

#### Scenario: Check tenant permission
- **WHEN** checking if user can manage tenant users
- **THEN** service returns boolean based on role

#### Scenario: Check workspace permission  
- **WHEN** checking if user can delete tasks
- **THEN** service returns boolean based on workspace role

---

### Requirement: Angular Permission Directive
The Angular application SHALL provide permission-based UI control.

#### Scenario: Hide button without permission
- **WHEN** user lacks permission to manage users
- **THEN** manage users button is hidden

#### Scenario: Disable action without permission
- **WHEN** user lacks permission to delete
- **THEN** delete button is disabled
