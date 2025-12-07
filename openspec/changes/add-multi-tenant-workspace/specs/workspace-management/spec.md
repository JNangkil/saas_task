## ADDED Requirements

### Requirement: Workspace Entity Management
The system SHALL provide a Workspace entity representing a top-level grouping within a Tenant (e.g., "Marketing", "Development"). Each Workspace SHALL have the following attributes:
- **id**: Unique identifier (UUID or auto-increment)
- **tenant_id**: Foreign key to parent tenant (required)
- **name**: Workspace display name (required, max 255 characters)
- **description**: Optional description text (max 1000 characters)
- **color**: Hex color code for visual identification (e.g., #3B82F6)
- **icon**: Icon identifier or emoji (optional)
- **is_archived**: Boolean flag for soft archive state
- **is_default**: Boolean flag indicating tenant's default workspace
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update
- **deleted_at**: Soft delete timestamp (nullable)

#### Scenario: Create a new workspace
- **WHEN** a tenant admin creates a workspace with name "Marketing", color "#10B981"
- **THEN** the system creates a Workspace record under the tenant
- **AND** the creating user is added to the workspace with role "admin"

#### Scenario: Workspace name uniqueness within tenant
- **WHEN** a user creates a workspace with name "Marketing" in a tenant that already has a workspace named "Marketing"
- **THEN** the system returns a validation error indicating the name is taken

#### Scenario: Create workspace in different tenants with same name
- **WHEN** workspaces named "Development" exist in Tenant A and Tenant B
- **THEN** both workspaces are valid since uniqueness is per-tenant

---

### Requirement: Workspace Update and Archival
The system SHALL support updating workspace details and archiving workspaces with soft delete.

#### Scenario: Update workspace details
- **WHEN** a workspace admin updates the workspace description and color
- **THEN** the system saves the changes
- **AND** the updated_at timestamp is refreshed

#### Scenario: Archive a workspace
- **WHEN** a workspace admin archives a workspace
- **THEN** the workspace is_archived flag is set to true
- **AND** the workspace no longer appears in the active workspace list
- **AND** boards and tasks within the workspace are preserved but not accessible

#### Scenario: Restore archived workspace
- **WHEN** a tenant admin restores an archived workspace
- **THEN** the workspace is_archived flag is set to false
- **AND** the workspace reappears in the active workspace list

#### Scenario: Delete workspace (soft delete)
- **WHEN** a tenant owner permanently deletes a workspace
- **THEN** the deleted_at timestamp is set
- **AND** the workspace is excluded from all queries
- **AND** the workspace can be recovered by super admin if needed

#### Scenario: Prevent deleting default workspace
- **WHEN** a user attempts to delete the tenant's default workspace
- **THEN** the system returns an error requiring a new default to be set first

---

### Requirement: Workspace API Endpoints
The system SHALL expose REST API endpoints for workspace management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tenants/{tenant}/workspaces | List workspaces in tenant |
| POST | /api/tenants/{tenant}/workspaces | Create workspace in tenant |
| GET | /api/workspaces/{id} | Get workspace details |
| PUT | /api/workspaces/{id} | Update workspace |
| POST | /api/workspaces/{id}/archive | Archive workspace |
| POST | /api/workspaces/{id}/restore | Restore archived workspace |
| DELETE | /api/workspaces/{id} | Soft delete workspace |

#### Scenario: List workspaces with pagination
- **WHEN** a user requests GET /api/tenants/{tenant}/workspaces?page=1&per_page=20
- **THEN** the system returns a paginated list of workspaces the user has access to
- **AND** archived workspaces are excluded by default

#### Scenario: List workspaces including archived
- **WHEN** a request includes GET /api/tenants/{tenant}/workspaces?include_archived=true
- **THEN** the system returns both active and archived workspaces
- **AND** each workspace includes an is_archived flag

#### Scenario: Get workspace with access control
- **WHEN** a user requests GET /api/workspaces/{id} for a workspace they're not a member of
- **THEN** the system returns HTTP 403 Forbidden

---

### Requirement: Workspace Request Validation
The system SHALL validate all workspace API requests using Laravel Form Request classes.

| Field | Rules |
|-------|-------|
| name | required, string, max:255, unique within tenant |
| description | nullable, string, max:1000 |
| color | nullable, string, regex:/^#[0-9A-Fa-f]{6}$/ |
| icon | nullable, string, max:50 |

#### Scenario: Validate workspace creation
- **WHEN** a request to create a workspace has an invalid color "#GGG"
- **THEN** the system returns HTTP 422 with color validation error

---

### Requirement: Workspace-User Association
The system SHALL maintain a many-to-many relationship between workspaces and users through a `workspace_user` pivot table with the following attributes:
- **workspace_id**: Foreign key to workspaces
- **user_id**: Foreign key to users
- **role**: User's role within workspace (admin, member, viewer)
- **joined_at**: Timestamp when user was added

#### Scenario: Add user to workspace
- **WHEN** a workspace admin adds a user to the workspace
- **THEN** a workspace_user record is created
- **AND** joined_at is set to current timestamp

#### Scenario: User belongs to multiple workspaces
- **WHEN** a user is a member of both "Marketing" and "Development" workspaces
- **THEN** the user can switch between workspaces
- **AND** permissions are evaluated per-workspace

#### Scenario: Remove user from workspace
- **WHEN** a workspace admin removes a user from the workspace
- **THEN** the workspace_user record is deleted
- **AND** the user loses access to boards and tasks in that workspace

---

### Requirement: Workspace Hierarchy and Relationships
The Workspace entity serves as the top-level context for boards and tasks. The system SHALL enforce the following relationships:
- Workspace belongs to exactly one Tenant
- Workspace has many Boards
- Workspace has many Users through workspace_user
- Deleting/archiving a workspace affects its boards (cascade soft delete or restrict)

#### Scenario: Boards inherit workspace context
- **WHEN** a board is created within a workspace
- **THEN** the board inherits the workspace's tenant_id
- **AND** the board is only visible to workspace members

#### Scenario: Cascade behavior on workspace deletion
- **WHEN** a workspace is soft-deleted
- **THEN** all boards within the workspace are soft-deleted
- **AND** all tasks within those boards are soft-deleted
