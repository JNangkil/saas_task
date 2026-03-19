## ADDED Requirements

### Requirement: Board Entity
The system SHALL provide a Board entity representing a project or task container within a workspace. Each Board SHALL have the following attributes:
- **id**: Unique identifier (UUID)
- **workspace_id**: Foreign key to workspace (required)
- **tenant_id**: Foreign key to tenant (denormalized for scoping)
- **name**: Board name (required, max 100 characters)
- **description**: Board description (nullable, max 1000 characters)
- **color**: Hex color code (default: #6366F1)
- **icon**: Icon identifier (default: clipboard)
- **type**: Board type enum (standard, personal)
- **is_archived**: Archive status (default: false)
- **created_by**: Foreign key to creating user
- **position**: Display order in sidebar (integer)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update
- **deleted_at**: Soft delete timestamp

#### Scenario: Create a new board
- **WHEN** a workspace member creates a board with name "Q1 Marketing"
- **THEN** the system creates a Board record
- **AND** tenant_id is inherited from workspace
- **AND** created_by is set to current user
- **AND** position is set to append at end

#### Scenario: Board name required
- **WHEN** a board is created without a name
- **THEN** the system returns validation error "Board name is required"

#### Scenario: Board name uniqueness within workspace
- **WHEN** a board with name "Marketing" is created in a workspace that already has a "Marketing" board
- **THEN** the system allows it (names don't need to be unique)

---

### Requirement: Board Types
The system SHALL support the following board types:

| Type | Description | Visibility |
|------|-------------|------------|
| standard | Team/project board | All workspace members |
| personal | Individual tasks | Creator only |

#### Scenario: Create personal board
- **WHEN** a user creates a board with type "personal"
- **THEN** only the creator can view and access the board

#### Scenario: Standard board visibility
- **WHEN** a user creates a board with type "standard"
- **THEN** all workspace members can access based on their role

---

### Requirement: Board Relationships
The Board entity SHALL have the following relationships:
- **belongs to** Workspace (many-to-one)
- **belongs to** Tenant (many-to-one)
- **belongs to** User as creator (many-to-one)
- **has many** Tasks (one-to-many)
- **has many** BoardColumns (one-to-many)
- **has many** Users as favorites (many-to-many via user_board_favorites)

#### Scenario: Load board with relationships
- **WHEN** a board is fetched with includes
- **THEN** the response can include workspace, creator, task count, column count

---

### Requirement: Board API Endpoints
The system SHALL expose REST API endpoints for board management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/workspaces/{workspace}/boards | Yes | List boards |
| POST | /api/workspaces/{workspace}/boards | Yes | Create board |
| GET | /api/boards/{board} | Yes | Get board details |
| PATCH | /api/boards/{board} | Yes | Update board |
| DELETE | /api/boards/{board} | Yes | Delete board |
| POST | /api/boards/{board}/archive | Yes | Archive board |
| POST | /api/boards/{board}/restore | Yes | Restore archived board |

#### Scenario: List workspace boards
- **WHEN** a workspace member requests GET /api/workspaces/{workspace}/boards
- **THEN** the system returns boards filtered by access
- **AND** personal boards only visible to creators
- **AND** archived boards excluded by default

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | all, active, archived |
| type | string | standard, personal |
| search | string | Filter by name |
| sort | string | name, created_at, position |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Q1 Marketing",
      "description": "Marketing campaigns for Q1",
      "color": "#EC4899",
      "icon": "megaphone",
      "type": "standard",
      "is_archived": false,
      "is_favorite": true,
      "task_count": 24,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 5
  }
}
```

#### Scenario: Create board from template
- **WHEN** POST includes template_id
- **THEN** board is created with template's columns and configuration

**Create Request Payload:**
```json
{
  "name": "Q1 Marketing",
  "description": "Marketing campaigns for Q1",
  "color": "#EC4899",
  "icon": "megaphone",
  "type": "standard",
  "template_id": "template-uuid",
  "include_sample_tasks": false
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| name | required, string, max:100 |
| description | nullable, string, max:1000 |
| color | nullable, regex:hex color |
| icon | nullable, in:allowed_icons |
| type | nullable, in:standard,personal |
| template_id | nullable, exists:board_templates,id |

---

### Requirement: Board Archive/Restore
The system SHALL support archiving and restoring boards.

#### Scenario: Archive board
- **WHEN** an owner/admin archives a board
- **THEN** is_archived is set to true
- **AND** board is hidden from default list
- **AND** all data is preserved

#### Scenario: Restore archived board
- **WHEN** an owner/admin restores an archived board
- **THEN** is_archived is set to false
- **AND** board reappears in active list

#### Scenario: Delete archived board
- **WHEN** an owner deletes a board
- **THEN** board is soft-deleted (deleted_at set)
- **AND** data is preserved for potential recovery

---

### Requirement: Board Favorites
The system SHALL support favoriting boards for quick access.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/boards/{board}/favorite | Add to favorites |
| DELETE | /api/boards/{board}/favorite | Remove from favorites |
| GET | /api/user/favorite-boards | List user's favorites |

#### Scenario: Add board to favorites
- **WHEN** a user favorites a board
- **THEN** user_board_favorites record is created
- **AND** board appears in favorites list

#### Scenario: Remove from favorites
- **WHEN** a user unfavorites a board
- **THEN** favorite record is deleted
- **AND** board no longer in favorites list

#### Scenario: Include favorite status in board list
- **WHEN** listing boards
- **THEN** each board includes is_favorite boolean for current user

---

### Requirement: Board Authorization
The system SHALL enforce workspace-based authorization for boards.

#### Scenario: Workspace member access
- **WHEN** a workspace member accesses a standard board
- **THEN** access is granted based on workspace role

#### Scenario: Personal board access
- **WHEN** a user accesses a personal board
- **THEN** only the creator has access
- **AND** others receive HTTP 403 Forbidden

#### Scenario: Cross-workspace denial
- **WHEN** a user attempts to access a board in a workspace they don't belong to
- **THEN** HTTP 403 Forbidden is returned

#### Scenario: Admin can manage boards
- **WHEN** a workspace Admin or Owner updates/archives a board
- **THEN** the action is allowed
- **AND** Members can only update boards they created
