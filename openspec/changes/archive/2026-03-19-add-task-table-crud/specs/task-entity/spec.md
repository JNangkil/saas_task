## ADDED Requirements

### Requirement: Task Entity
The system SHALL provide a Task entity representing a unit of work within a Board. Each Task SHALL have the following attributes:
- **id**: Unique identifier (UUID or auto-increment)
- **board_id**: Foreign key to parent board (required)
- **workspace_id**: Foreign key to workspace (denormalized for scoping)
- **tenant_id**: Foreign key to tenant (denormalized for scoping)
- **title**: Task name/title (required, max 500 characters)
- **description**: Rich text description (nullable, max 50000 characters)
- **status**: Task status (todo, in_progress, review, done, blocked)
- **priority**: Task priority (low, medium, high, urgent)
- **due_date**: Due date (nullable, date)
- **start_date**: Start date (nullable, date)
- **assignee_id**: Foreign key to assigned user (nullable)
- **created_by**: Foreign key to creating user (required)
- **position**: Order index within board (decimal for fractional indexing)
- **archived_at**: Archive timestamp (nullable)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update
- **deleted_at**: Soft delete timestamp (nullable)

#### Scenario: Create a new task
- **WHEN** a user creates a task with title "Design homepage mockup"
- **THEN** the system creates a Task record
- **AND** position is set to append at end of board
- **AND** created_by is set to current user
- **AND** tenant_id and workspace_id are inherited from board

#### Scenario: Task title required
- **WHEN** a task is created without a title
- **THEN** the system returns validation error "Title is required"

#### Scenario: Date validation
- **WHEN** a task has start_date after due_date
- **THEN** the system returns validation error "Start date must be before due date"

---

### Requirement: Task Status Values
The system SHALL support the following task status values:

| Status | Description | Color (suggested) |
|--------|-------------|-------------------|
| todo | Not started | Gray |
| in_progress | Currently being worked on | Blue |
| review | Awaiting review/approval | Yellow |
| done | Completed | Green |
| blocked | Cannot proceed | Red |

#### Scenario: Update task status
- **WHEN** a user changes a task's status to "in_progress"
- **THEN** the task status is updated
- **AND** updated_at is refreshed

---

### Requirement: Task Priority Values
The system SHALL support the following task priority values:

| Priority | Description | Sort Order |
|----------|-------------|------------|
| low | Low priority | 1 |
| medium | Normal priority | 2 |
| high | High priority | 3 |
| urgent | Critical/urgent | 4 |

#### Scenario: Filter by priority
- **WHEN** a query filters tasks by priority "high"
- **THEN** only tasks with priority "high" are returned

---

### Requirement: Task Labels/Tags
The system SHALL support assigning multiple labels to tasks via a many-to-many relationship.

**Label Attributes:**
- id, workspace_id, name, color, created_at

#### Scenario: Assign labels to task
- **WHEN** a user adds labels "Frontend" and "Urgent" to a task
- **THEN** task_labels pivot records are created
- **AND** labels are returned with task details

#### Scenario: Label scoped to workspace
- **WHEN** a label is created in a workspace
- **THEN** the label is only available to tasks in that workspace

---

### Requirement: Task Position/Ordering
The system SHALL maintain task order within a board using fractional position indexing.

#### Scenario: Default position on create
- **WHEN** a new task is created in a board
- **THEN** position is set to max(existing positions) + 1

#### Scenario: Insert between tasks
- **WHEN** a task is moved between position 1.0 and 2.0
- **THEN** the task's position is set to 1.5
- **AND** no other tasks are updated

#### Scenario: Reorder at beginning
- **WHEN** a task is moved to the beginning
- **THEN** position is set to first_position / 2

---

### Requirement: Task Custom Fields
The system SHALL support flexible custom fields via a `task_custom_values` table.

**TaskCustomValue Attributes:**
- id, task_id, field_key (e.g., "custom_budget"), field_value (JSON)

```json
// Example field_value structure
{"type": "number", "value": 5000}
{"type": "text", "value": "Client ABC"}
{"type": "date", "value": "2024-03-15"}
{"type": "select", "value": "option_1"}
```

#### Scenario: Set custom field value
- **WHEN** a user sets custom field "budget" to 5000 on a task
- **THEN** a task_custom_values record is created/updated
- **AND** the value is stored as JSON {"type": "number", "value": 5000}

#### Scenario: Query tasks by custom field
- **WHEN** filtering tasks where "budget" > 1000
- **THEN** tasks with matching custom_values are returned

---

### Requirement: Task Soft Delete and Archive
The system SHALL support soft delete and archive patterns for tasks.

#### Scenario: Archive a task
- **WHEN** a user archives a task
- **THEN** archived_at is set to current timestamp
- **AND** the task is excluded from default queries
- **AND** the task can be restored

#### Scenario: Soft delete a task
- **WHEN** a user deletes a task
- **THEN** deleted_at is set (soft delete)
- **AND** the task is excluded from all queries
- **AND** data is preserved for recovery

#### Scenario: Restore archived task
- **WHEN** a user restores an archived task
- **THEN** archived_at is set to null
- **AND** the task reappears in the board

---

### Requirement: Task Relationships
The Task entity SHALL have the following relationships:
- **belongs to** Board (many-to-one)
- **belongs to** Workspace (many-to-one, via board)
- **belongs to** Tenant (many-to-one, via workspace)
- **belongs to** User as assignee (many-to-one, nullable)
- **belongs to** User as creator (many-to-one)
- **has many** Labels (many-to-many via task_labels)
- **has many** TaskCustomValues (one-to-many)

#### Scenario: Load task with relationships
- **WHEN** a task is fetched with includes
- **THEN** the response can include board, assignee, creator, labels
