## ADDED Requirements

### Requirement: BoardColumn Entity
The system SHALL provide a BoardColumn entity representing a column definition for a board. Each BoardColumn SHALL have the following attributes:
- **id**: Unique identifier
- **board_id**: Foreign key to parent board (required)
- **name**: Column display name (required, max 100 characters)
- **type**: Column type enum (required)
- **options**: JSON object with type-specific configuration
- **position**: Display order within board (integer)
- **width**: Column width in pixels (default: 150)
- **is_hidden**: Whether column is hidden from view (default: false)
- **is_pinned**: Whether column is pinned to left (default: false)
- **is_required**: Whether value is required for tasks (default: false)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### Scenario: Create a new column
- **WHEN** a board admin adds a column with name "Budget" and type "number"
- **THEN** the system creates a BoardColumn record
- **AND** position is set to append at end
- **AND** default options are applied based on type

#### Scenario: Column name uniqueness within board
- **WHEN** a column with name "Status" is created in a board that already has a "Status" column
- **THEN** the system returns validation error "Column name already exists"

---

### Requirement: TaskFieldValue Entity
The system SHALL provide a TaskFieldValue entity for storing dynamic column values per task.

**Attributes:**
- **id**: Unique identifier
- **task_id**: Foreign key to task (required)
- **column_id**: Foreign key to board_column (required)
- **value**: JSON object containing typed value
- **created_at**: Timestamp
- **updated_at**: Timestamp

**Unique Constraint:** (task_id, column_id)

#### Scenario: Store field value
- **WHEN** a user sets a custom field value on a task
- **THEN** a TaskFieldValue record is created or updated
- **AND** the value is stored as typed JSON

#### Scenario: Delete orphaned values
- **WHEN** a column is deleted from a board
- **THEN** related TaskFieldValues are soft-deleted (preserved for recovery)

---

### Requirement: Default Board Columns
The system SHALL create default columns when a new board is created.

**Default Columns:**
| Name | Type | Required | Pinned | Position |
|------|------|----------|--------|----------|
| Title | text | Yes | Yes | 1 |
| Status | status | No | No | 2 |
| Priority | priority | No | No | 3 |
| Assignee | user | No | No | 4 |
| Due Date | date | No | No | 5 |

#### Scenario: Create board with default columns
- **WHEN** a new board is created
- **THEN** default columns are automatically created
- **AND** Title column is pinned and required

#### Scenario: Title column is protected
- **WHEN** a user attempts to delete the Title column
- **THEN** the system returns error "Title column cannot be deleted"

---

### Requirement: Column API Endpoints
The system SHALL expose REST API endpoints for column management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/boards/{board}/columns | Yes | List board columns |
| POST | /api/boards/{board}/columns | Yes | Create column |
| PATCH | /api/columns/{column} | Yes | Update column |
| DELETE | /api/columns/{column} | Yes | Delete column |
| PATCH | /api/boards/{board}/columns/reorder | Yes | Reorder columns |

#### Scenario: List board columns
- **WHEN** a user requests GET /api/boards/{board}/columns
- **THEN** all columns are returned ordered by position
- **AND** includes type metadata and options

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Status",
      "type": "status",
      "position": 2,
      "width": 150,
      "is_hidden": false,
      "is_pinned": false,
      "is_required": false,
      "options": {
        "statuses": [
          {"id": "todo", "label": "To Do", "color": "#9CA3AF"},
          {"id": "in_progress", "label": "In Progress", "color": "#3B82F6"}
        ],
        "default_value": "todo"
      }
    }
  ]
}
```

#### Scenario: Create column with options
- **WHEN** a POST request creates a status column with custom options
- **THEN** the column is created with provided status options
- **AND** options are validated against type schema

#### Scenario: Authorization for column management
- **WHEN** a workspace Member attempts to create/delete columns
- **THEN** the system returns HTTP 403 Forbidden
- **AND** only Admin/Owner can manage columns

---

### Requirement: Column Create Request Validation
The system SHALL validate column creation requests.

**Request Payload:**
```json
{
  "name": "Budget",
  "type": "number",
  "options": {
    "format": "currency",
    "currency": "USD",
    "precision": 2
  },
  "is_required": false
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| name | required, string, max:100, unique per board |
| type | required, in: supported column types |
| options | nullable, must match type schema |
| is_required | boolean |
| position | nullable, integer |

#### Scenario: Validate type-specific options
- **WHEN** a status column is created without any status options
- **THEN** default status options are applied (To Do, In Progress, Done)

---

### Requirement: Column Reorder
The system SHALL support bulk column reordering.

**Request Payload (PATCH /api/boards/{board}/columns/reorder):**
```json
{
  "column_order": ["col-uuid-1", "col-uuid-3", "col-uuid-2"]
}
```

#### Scenario: Reorder columns
- **WHEN** a reorder request is submitted
- **THEN** all columns' positions are updated to match array order
- **AND** response returns updated columns

#### Scenario: Preserve pinned column position
- **WHEN** a pinned column is included in reorder
- **THEN** pinned columns remain at the start regardless of order

---

### Requirement: User Column Preferences
The system SHALL store per-user column preferences for each board.

**Preferences Include:**
- Column order (user's preferred order)
- Column widths (per column)
- Hidden columns (columns user has hidden)

#### Scenario: User hides column
- **WHEN** a user hides a column
- **THEN** the column is hidden only for that user
- **AND** other users still see the column

#### Scenario: User resizes column
- **WHEN** a user resizes a column width
- **THEN** the new width is saved for that user only

#### Scenario: Load user preferences
- **WHEN** a user loads a board
- **THEN** their column order, widths, and hidden columns are applied
