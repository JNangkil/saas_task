## ADDED Requirements

### Requirement: Activity Log Entity
The system SHALL provide an ActivityLog entity for recording all significant actions.

**Attributes:**
- id: UUID primary key
- tenant_id: FK to tenant (required)
- workspace_id: FK to workspace (nullable for tenant-level)
- user_id: FK to user (nullable for system actions)
- action_type: Action type string (required)
- entity_type: Entity type string (required)
- entity_id: UUID of affected entity (required)
- entity_name: Display name of entity (nullable)
- metadata: JSON containing change details
- created_at: Timestamp

#### Scenario: Create activity log
- **WHEN** an action is logged
- **THEN** an ActivityLog record is created with all fields

---

### Requirement: Action Types
The system SHALL define standardized action types.

| Action Type | Entity Type | Description |
|-------------|-------------|-------------|
| task.created | task | Task created |
| task.updated | task | Task fields changed |
| task.deleted | task | Task deleted |
| task.moved | task | Task moved to board |
| task.assigned | task | Assignee changed |
| task.status_changed | task | Status changed |
| board.created | board | Board created |
| board.updated | board | Board updated |
| board.archived | board | Board archived |
| board.restored | board | Board restored |
| comment.added | task | Comment added |
| comment.deleted | task | Comment deleted |
| file.attached | task | File attached |
| file.removed | task | File removed |
| member.added | workspace | User added |
| member.removed | workspace | User removed |
| member.role_changed | workspace | Role changed |

#### Scenario: Valid action type
- **WHEN** logging an action
- **THEN** action_type must be from defined list

---

### Requirement: Metadata Structure
The system SHALL store change details in structured JSON metadata.

#### Scenario: Field change metadata
- **WHEN** a field is changed
- **THEN** metadata contains old and new values

#### Scenario: Context in metadata
- **WHEN** action has relevant context
- **THEN** metadata includes board_id, board_name, etc.

---

### Requirement: Activity Service
The system SHALL provide a central ActivityService for logging.

#### Scenario: Log action
- **WHEN** ActivityService.log is called
- **THEN** activity record is created with current user

#### Scenario: Log changes
- **WHEN** model changes are detected
- **THEN** old and new values are captured in metadata

---

### Requirement: LogsActivity Trait
The system SHALL provide a trait for automatic model logging.

#### Scenario: Auto-log on create
- **WHEN** a model with LogsActivity is created
- **THEN** activity is logged automatically

#### Scenario: Auto-log on update
- **WHEN** a model with LogsActivity is updated
- **THEN** only changed fields are logged

#### Scenario: Auto-log on delete
- **WHEN** a model with LogsActivity is deleted
- **THEN** activity is logged automatically

---

### Requirement: Retention Policy
The system SHALL support configurable activity retention.

#### Scenario: Default retention
- **WHEN** no custom retention is set
- **THEN** activities are kept for 90 days

#### Scenario: Cleanup old activities
- **WHEN** retention cleanup runs
- **THEN** activities older than retention period are deleted
