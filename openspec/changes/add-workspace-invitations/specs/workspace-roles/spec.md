## ADDED Requirements

### Requirement: Workspace Role Definitions
The system SHALL support four predefined roles at the workspace level with distinct permission sets:
- **Owner**: Full control including workspace deletion and ownership transfer
- **Admin**: Full management except ownership actions
- **Member**: Create and edit content, no management permissions
- **Viewer**: Read-only access to workspace content

#### Scenario: Role hierarchy enforcement
- **WHEN** a user has the Admin role in a workspace
- **THEN** the user can perform all actions except workspace.archive, workspace.delete, and ownership transfer
- **AND** the user can invite new members with roles Admin, Member, or Viewer

#### Scenario: Single owner per workspace
- **WHEN** a workspace is created
- **THEN** the creating user is assigned the Owner role
- **AND** there can be exactly one Owner per workspace at any time

---

### Requirement: Permission Matrix
The system SHALL enforce the following permission matrix for workspace roles:

| Permission | Description | Owner | Admin | Member | Viewer |
|------------|-------------|:-----:|:-----:|:------:|:------:|
| workspace.view | View workspace details | ✓ | ✓ | ✓ | ✓ |
| workspace.update | Update workspace name/settings | ✓ | ✓ | - | - |
| workspace.archive | Archive the workspace | ✓ | - | - | - |
| workspace.delete | Permanently delete workspace | ✓ | - | - | - |
| boards.view | View boards in workspace | ✓ | ✓ | ✓ | ✓ |
| boards.create | Create new boards | ✓ | ✓ | ✓ | - |
| boards.update | Update board settings | ✓ | ✓ | ✓ | - |
| boards.delete | Delete boards | ✓ | ✓ | - | - |
| columns.manage | Add/edit/delete columns | ✓ | ✓ | ✓ | - |
| tasks.view | View tasks | ✓ | ✓ | ✓ | ✓ |
| tasks.create | Create tasks | ✓ | ✓ | ✓ | - |
| tasks.update | Update task fields | ✓ | ✓ | ✓ | - |
| tasks.delete | Delete tasks | ✓ | ✓ | ✓ | - |
| tasks.move | Move tasks between columns/boards | ✓ | ✓ | ✓ | - |
| members.view | View workspace members | ✓ | ✓ | ✓ | ✓ |
| members.invite | Invite new members | ✓ | ✓ | - | - |
| members.remove | Remove members | ✓ | ✓ | - | - |
| members.change_role | Change member roles | ✓ | ✓ | - | - |
| analytics.view | View workspace analytics | ✓ | ✓ | ✓ | ✓ |
| analytics.export | Export analytics data | ✓ | ✓ | - | - |

#### Scenario: Check permission for task creation
- **WHEN** a Member attempts to create a task
- **THEN** the system allows the action (Member has tasks.create permission)

#### Scenario: Deny permission for board deletion
- **WHEN** a Member attempts to delete a board
- **THEN** the system returns HTTP 403 Forbidden
- **AND** the error message indicates insufficient permissions

#### Scenario: Viewer read-only access
- **WHEN** a Viewer attempts to create, update, or delete any content
- **THEN** the system returns HTTP 403 Forbidden
- **AND** the user can only view existing content

---

### Requirement: Permission Checking API
The system SHALL provide an endpoint to check user permissions for a workspace.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/permissions | Get current user's permissions |

#### Scenario: Retrieve user permissions
- **WHEN** an authenticated user requests GET /api/workspaces/{workspace}/permissions
- **THEN** the system returns a JSON object with:
  - role: The user's role in the workspace
  - permissions: Array of permission strings the user has

**Response Payload:**
```json
{
  "role": "admin",
  "permissions": [
    "workspace.view",
    "workspace.update",
    "boards.view",
    "boards.create",
    "boards.update",
    "boards.delete",
    ...
  ]
}
```

---

### Requirement: Role Change Constraints
The system SHALL enforce constraints on role changes to prevent privilege escalation.

#### Scenario: Admin cannot promote to Owner
- **WHEN** an Admin attempts to change another user's role to Owner
- **THEN** the system returns HTTP 403 Forbidden
- **AND** only the current Owner can transfer ownership

#### Scenario: Owner transfers ownership
- **WHEN** an Owner changes another Admin's role to Owner
- **THEN** the original Owner's role is demoted to Admin
- **AND** the new user becomes the sole Owner

#### Scenario: Cannot demote last admin
- **WHEN** an attempt is made to change the last Admin to Member/Viewer
- **THEN** the system allows it only if the Owner can manage the workspace alone
- **AND** a warning is displayed to the user

#### Scenario: Self role change prevention
- **WHEN** a user attempts to change their own role
- **THEN** the system prevents the action
- **AND** returns an error "Cannot change your own role"
