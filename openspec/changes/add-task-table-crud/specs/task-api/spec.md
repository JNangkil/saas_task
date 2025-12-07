## ADDED Requirements

### Requirement: Task API Endpoints
The system SHALL expose REST API endpoints for task management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/boards/{board}/tasks | Yes | List tasks in board |
| POST | /api/boards/{board}/tasks | Yes | Create task in board |
| GET | /api/tasks/{task} | Yes | Get task details |
| PATCH | /api/tasks/{task} | Yes | Update task |
| DELETE | /api/tasks/{task} | Yes | Soft delete task |
| POST | /api/tasks/{task}/archive | Yes | Archive task |
| POST | /api/tasks/{task}/restore | Yes | Restore archived task |
| POST | /api/tasks/{task}/duplicate | Yes | Duplicate task |
| PATCH | /api/tasks/{task}/position | Yes | Update task position |

#### Scenario: List tasks in board
- **WHEN** a workspace member requests GET /api/boards/{board}/tasks
- **THEN** the system returns a paginated list of tasks
- **AND** archived tasks are excluded by default
- **AND** tasks are ordered by position

---

### Requirement: Task List Filtering
The system SHALL support the following query filters on task list:

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string (comma-separated) | Filter by status(es) |
| priority | string (comma-separated) | Filter by priority(ies) |
| assignee_id | uuid | Filter by assignee |
| created_by | uuid | Filter by creator |
| due_from | date | Due date >= value |
| due_to | date | Due date <= value |
| search | string | Full-text search on title/description |
| include_archived | boolean | Include archived tasks |
| labels | string (comma-separated) | Filter by label IDs |

#### Scenario: Filter by status
- **WHEN** GET /api/boards/{board}/tasks?status=todo,in_progress
- **THEN** only tasks with status "todo" or "in_progress" are returned

#### Scenario: Filter by due date range
- **WHEN** GET /api/boards/{board}/tasks?due_from=2024-01-01&due_to=2024-01-31
- **THEN** only tasks with due_date in January 2024 are returned

#### Scenario: Search tasks
- **WHEN** GET /api/boards/{board}/tasks?search=homepage
- **THEN** tasks with "homepage" in title or description are returned

---

### Requirement: Task List Sorting
The system SHALL support the following sort options:

| Parameter | Values | Default |
|-----------|--------|---------|
| sort | position, created_at, due_date, priority, title | position |
| order | asc, desc | asc |

#### Scenario: Sort by due date
- **WHEN** GET /api/boards/{board}/tasks?sort=due_date&order=asc
- **THEN** tasks are sorted by due_date ascending
- **AND** null due dates appear last

#### Scenario: Sort by priority
- **WHEN** GET /api/boards/{board}/tasks?sort=priority&order=desc
- **THEN** tasks are sorted urgent → high → medium → low

---

### Requirement: Task List Pagination
The system SHALL support cursor-based pagination for task lists.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| per_page | integer | 50 | Items per page (max 100) |
| cursor | string | null | Pagination cursor |
| page | integer | null | Offset-based page (fallback) |

**Response Meta:**
```json
{
  "data": [...],
  "meta": {
    "cursor": "eyJpZCI6MTAwfQ==",
    "has_more": true,
    "total": 1250,
    "per_page": 50
  }
}
```

#### Scenario: Cursor-based pagination
- **WHEN** a request includes ?cursor=xxx
- **THEN** tasks after the cursor position are returned

#### Scenario: Offset fallback
- **WHEN** a request includes ?page=3&per_page=50
- **THEN** tasks 101-150 are returned

---

### Requirement: Create Task Request
The system SHALL validate task creation requests.

**Request Payload (POST /api/boards/{board}/tasks):**
```json
{
  "title": "Design homepage mockup",
  "description": "Create wireframe and high-fidelity mockup",
  "status": "todo",
  "priority": "high",
  "due_date": "2024-02-15",
  "start_date": "2024-02-01",
  "assignee_id": "uuid",
  "labels": ["uuid1", "uuid2"],
  "position": 1.5,
  "custom_fields": {
    "budget": {"type": "number", "value": 5000}
  }
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| title | required, string, max:500 |
| description | nullable, string, max:50000 |
| status | nullable, in:todo,in_progress,review,done,blocked |
| priority | nullable, in:low,medium,high,urgent |
| due_date | nullable, date, after_or_equal:start_date |
| start_date | nullable, date |
| assignee_id | nullable, exists:users,id, must be workspace member |
| labels | nullable, array of label UUIDs |
| position | nullable, numeric |

**Response Payload (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "title": "Design homepage mockup",
    "status": "todo",
    "priority": "high",
    "due_date": "2024-02-15",
    "assignee": { "id": "uuid", "name": "John Doe", "avatar": "..." },
    "labels": [{ "id": "uuid", "name": "Design", "color": "#3B82F6" }],
    "position": 5.0,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### Scenario: Create task with minimal data
- **WHEN** a request includes only title
- **THEN** task is created with default status "todo", no priority
- **AND** position is set automatically

#### Scenario: Invalid assignee
- **WHEN** assignee_id is not a workspace member
- **THEN** HTTP 422 with error "Assignee must be a workspace member"

---

### Requirement: Update Task Request
The system SHALL support partial updates to tasks.

**Request Payload (PATCH /api/tasks/{task}):**
```json
{
  "status": "in_progress"
}
```

#### Scenario: Partial update
- **WHEN** PATCH request includes only "status"
- **THEN** only status field is updated
- **AND** other fields remain unchanged

#### Scenario: Bulk field update
- **WHEN** PATCH request includes multiple fields
- **THEN** all provided fields are updated atomically

---

### Requirement: Position Update
The system SHALL support explicit position updates for drag-and-drop reordering.

**Request Payload (PATCH /api/tasks/{task}/position):**
```json
{
  "after_task_id": "uuid",
  "before_task_id": "uuid"
}
```

#### Scenario: Move between tasks
- **WHEN** after_task_id and before_task_id are both provided
- **THEN** position is calculated as midpoint between them

#### Scenario: Move to beginning
- **WHEN** only before_task_id is provided
- **THEN** position is set to before_position / 2

#### Scenario: Move to end
- **WHEN** only after_task_id is provided
- **THEN** position is set to after_position + 1

---

### Requirement: Duplicate Task
The system SHALL support task duplication.

**Request Payload (POST /api/tasks/{task}/duplicate):**
```json
{
  "title_suffix": " (Copy)",
  "include_labels": true,
  "include_custom_fields": true
}
```

#### Scenario: Duplicate task
- **WHEN** a user duplicates a task
- **THEN** a new task is created with copied fields
- **AND** title has suffix appended
- **AND** status is reset to "todo"
- **AND** position is set after original

---

### Requirement: Task Authorization
The system SHALL enforce workspace-based authorization for tasks.

#### Scenario: Workspace member access
- **WHEN** a workspace member accesses tasks in their workspace
- **THEN** access is granted based on workspace role

#### Scenario: Cross-workspace denial
- **WHEN** a user attempts to access a task in a workspace they don't belong to
- **THEN** HTTP 403 Forbidden is returned

#### Scenario: Viewer cannot modify
- **WHEN** a workspace Viewer attempts to create/update/delete a task
- **THEN** HTTP 403 Forbidden is returned

---

### Requirement: Task Response Resource
The system SHALL format task responses using a consistent resource structure.

**Full Task Response:**
```json
{
  "data": {
    "id": "uuid",
    "board_id": "uuid",
    "title": "Design homepage mockup",
    "description": "<p>Rich HTML content</p>",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2024-02-15",
    "start_date": "2024-02-01",
    "position": 1.5,
    "archived_at": null,
    "assignee": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "avatar_url": "..."
    },
    "creator": {
      "id": "uuid",
      "name": "Jane Admin"
    },
    "labels": [
      { "id": "uuid", "name": "Design", "color": "#3B82F6" },
      { "id": "uuid", "name": "Frontend", "color": "#10B981" }
    ],
    "custom_fields": {
      "budget": { "type": "number", "value": 5000 },
      "client": { "type": "text", "value": "Acme Corp" }
    },
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-20T14:30:00Z"
  }
}
```

**List Item Response (condensed):**
```json
{
  "id": "uuid",
  "title": "Design homepage mockup",
  "status": "in_progress",
  "priority": "high",
  "due_date": "2024-02-15",
  "position": 1.5,
  "assignee": { "id": "uuid", "name": "John Doe", "avatar_url": "..." },
  "labels": [{ "id": "uuid", "name": "Design", "color": "#3B82F6" }]
}
```

#### Scenario: Response format consistency
- **WHEN** any task endpoint returns task data
- **THEN** the response follows the standard resource structure
- **AND** relationships include id, name, and relevant display fields
- **AND** dates are formatted as ISO 8601 strings
