## ADDED Requirements

### Requirement: Task Assignee Field
The system SHALL support a single primary assignee per task.

#### Scenario: Assign task to user
- **WHEN** a task is assigned to a workspace member
- **THEN** assignee_id is set to that user

#### Scenario: Assignee must be workspace member
- **WHEN** assigning to user not in workspace
- **THEN** HTTP 422 validation error is returned

#### Scenario: Clear assignee
- **WHEN** assignee is set to null
- **THEN** task becomes unassigned

---

### Requirement: Task Watchers
The system SHALL support multiple watchers per task.

**task_watchers table:**
- id: UUID primary key
- task_id: FK to tasks
- user_id: FK to users
- created_at: timestamp

**Unique constraint:** (task_id, user_id)

#### Scenario: Add watcher
- **WHEN** a user is added as watcher
- **THEN** task_watchers record is created

#### Scenario: Watcher must be workspace member
- **WHEN** adding watcher not in workspace
- **THEN** HTTP 422 validation error is returned

#### Scenario: Duplicate watcher prevented
- **WHEN** adding same user as watcher twice
- **THEN** operation is idempotent (no error)

---

### Requirement: Assignment API Endpoints
The system SHALL expose REST API endpoints for task assignment.

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /api/tasks/{task}/assignee | Set primary assignee |
| GET | /api/tasks/{task}/watchers | List watchers |
| POST | /api/tasks/{task}/watchers | Add watcher |
| DELETE | /api/tasks/{task}/watchers/{user} | Remove watcher |

#### Scenario: Set assignee
- **WHEN** PATCH with assignee_id
- **THEN** task assignee is updated

#### Scenario: List watchers
- **WHEN** GET watchers
- **THEN** array of watching users is returned

#### Scenario: Add watcher
- **WHEN** POST with user_id
- **THEN** user is added as watcher

#### Scenario: Remove watcher
- **WHEN** DELETE watcher
- **THEN** user is removed from watchers

---

### Requirement: Assignment Notifications
The system SHALL notify users of assignment changes.

#### Scenario: Notify on assignment
- **WHEN** task is assigned to user
- **THEN** assignee receives notification

#### Scenario: Notify watchers on changes
- **WHEN** watched task is updated
- **THEN** watchers receive notification

#### Scenario: Notify when added as watcher
- **WHEN** user is added as watcher
- **THEN** they receive notification

---

### Requirement: Assignee Selector Component
The Angular application SHALL provide an AssigneeSelectorComponent.

#### Scenario: Display assignee selector
- **WHEN** editing task assignee
- **THEN** selector shows workspace members

#### Scenario: Search members
- **WHEN** typing in selector
- **THEN** members are filtered by name or email

#### Scenario: Show user avatar
- **WHEN** displaying member options
- **THEN** avatar and name are shown

#### Scenario: Clear selection
- **WHEN** clicking clear button
- **THEN** assignee is set to null

---

### Requirement: Watchers Component
The Angular application SHALL provide a TaskWatchersComponent.

#### Scenario: Display current watchers
- **WHEN** viewing task details
- **THEN** list of watcher avatars is shown

#### Scenario: Add watcher
- **WHEN** clicking add watcher
- **THEN** member selector opens

#### Scenario: Remove watcher
- **WHEN** clicking remove on watcher
- **THEN** watcher is removed from task

---

### Requirement: Assignment Change Tracking
The system SHALL track assignment history.

#### Scenario: Record assignment change
- **WHEN** assignee changes
- **THEN** activity log records old and new assignee

#### Scenario: Record watcher changes
- **WHEN** watcher is added or removed
- **THEN** activity log records the change
