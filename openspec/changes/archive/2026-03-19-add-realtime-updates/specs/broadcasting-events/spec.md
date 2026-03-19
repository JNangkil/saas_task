## ADDED Requirements

### Requirement: Broadcasting Channel Architecture
The system SHALL use Laravel Broadcasting with private channels scoped by tenant and board.

**Channel Naming Convention:**
| Channel Pattern | Purpose | Auth Required |
|-----------------|---------|---------------|
| `private-tenant.{tenantId}.board.{boardId}` | Board task/column updates | Workspace member |
| `presence-tenant.{tenantId}.board.{boardId}` | User presence tracking | Workspace member |
| `private-tenant.{tenantId}.workspace.{workspaceId}` | Workspace-wide events | Workspace member |

#### Scenario: Subscribe to board channel
- **WHEN** a user opens a board
- **THEN** they join the private board channel
- **AND** receive all task and column events for that board

#### Scenario: Channel authorization
- **WHEN** a user attempts to subscribe to a board channel
- **THEN** the system verifies user belongs to the tenant
- **AND** verifies user has access to the board's workspace

#### Scenario: Unauthorized subscription rejected
- **WHEN** a user without workspace access tries to subscribe
- **THEN** the subscription is denied
- **AND** an authorization error is returned

---

### Requirement: Task Events
The system SHALL broadcast events when tasks are created, updated, deleted, or reordered.

**Event Classes:**
| Event | Channel | Trigger |
|-------|---------|---------|
| TaskCreated | board.{id} | Task created |
| TaskUpdated | board.{id} | Task field(s) changed |
| TaskDeleted | board.{id} | Task deleted |
| TaskReordered | board.{id} | Task positions changed |

#### Scenario: Broadcast TaskCreated event
- **WHEN** a task is created via API
- **THEN** a TaskCreated event is broadcast to the board channel
- **AND** includes the full task object

**TaskCreated Payload:**
```json
{
  "event": "task.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "actor": {
    "id": "user-uuid",
    "name": "John Doe",
    "avatar": "https://..."
  },
  "data": {
    "task": {
      "id": "task-uuid",
      "title": "New task",
      "status": "todo",
      "position": 5.0
    }
  }
}
```

#### Scenario: Broadcast TaskUpdated event with changes
- **WHEN** a task is updated
- **THEN** TaskUpdated event includes changed fields
- **AND** includes both old and new values

**TaskUpdated Payload:**
```json
{
  "event": "task.updated",
  "timestamp": "2024-01-15T10:35:00Z",
  "actor": { "id": "...", "name": "..." },
  "data": {
    "id": "task-uuid",
    "changes": {
      "status": { "from": "todo", "to": "in_progress" },
      "assignee_id": { "from": null, "to": "user-uuid" }
    },
    "task": { /* full updated task */ }
  }
}
```

#### Scenario: Broadcast TaskDeleted event
- **WHEN** a task is deleted
- **THEN** TaskDeleted event broadcasts the task ID

**TaskDeleted Payload:**
```json
{
  "event": "task.deleted",
  "timestamp": "2024-01-15T10:40:00Z",
  "actor": { "id": "...", "name": "..." },
  "data": {
    "id": "task-uuid"
  }
}
```

#### Scenario: Broadcast TaskReordered event
- **WHEN** task positions are changed (drag-and-drop)
- **THEN** TaskReordered event includes all affected positions

**TaskReordered Payload:**
```json
{
  "event": "task.reordered",
  "timestamp": "2024-01-15T10:45:00Z",
  "actor": { "id": "...", "name": "..." },
  "data": {
    "positions": [
      { "id": "task-1", "position": 1.0 },
      { "id": "task-2", "position": 2.0 },
      { "id": "task-3", "position": 1.5 }
    ]
  }
}
```

---

### Requirement: Column Events
The system SHALL broadcast events when columns are created, updated, deleted, or reordered.

| Event | Trigger |
|-------|---------|
| ColumnCreated | Column added to board |
| ColumnUpdated | Column name/options changed |
| ColumnDeleted | Column removed |
| ColumnsReordered | Column order changed |

#### Scenario: Broadcast ColumnCreated event
- **WHEN** a column is added to a board
- **THEN** ColumnCreated event is broadcast with full column data

#### Scenario: Broadcast ColumnUpdated event
- **WHEN** column properties change (name, options, visibility)
- **THEN** ColumnUpdated event includes changes

---

### Requirement: Comment Events
The system SHALL broadcast events when comments are added, updated, or deleted.

| Event | Trigger |
|-------|---------|
| CommentAdded | New comment on task |
| CommentUpdated | Comment text edited |
| CommentDeleted | Comment removed |

#### Scenario: Broadcast CommentAdded event
- **WHEN** a user adds a comment to a task
- **THEN** CommentAdded event is broadcast
- **AND** includes comment content, author, and task reference

**CommentAdded Payload:**
```json
{
  "event": "comment.added",
  "timestamp": "2024-01-15T11:00:00Z",
  "actor": { "id": "...", "name": "...", "avatar": "..." },
  "data": {
    "task_id": "task-uuid",
    "comment": {
      "id": "comment-uuid",
      "content": "Great progress on this!",
      "created_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

---

### Requirement: Event Actor Exclusion
The system SHALL exclude the originating user from receiving their own events.

#### Scenario: Exclude event sender
- **WHEN** user A updates a task
- **THEN** user A does NOT receive the TaskUpdated event
- **AND** all other users on the channel DO receive it

**Implementation:**
```php
class TaskUpdated implements ShouldBroadcast
{
    public function broadcastAs()
    {
        return 'task.updated';
    }
    
    public function broadcastWhen()
    {
        // Event will still broadcast, but toOthers() in controller
        return true;
    }
}

// In controller
broadcast(new TaskUpdated($task, $changes))->toOthers();
```

---

### Requirement: Tenant Scoping
The system SHALL ensure all broadcast events are scoped to the correct tenant.

#### Scenario: Cross-tenant isolation
- **WHEN** a task is updated in Tenant A
- **THEN** only users in Tenant A receive the event
- **AND** users in Tenant B never receive events from Tenant A

#### Scenario: Channel name includes tenant
- **WHEN** subscribing to a board channel
- **THEN** the channel name includes tenant ID prefix
- **AND** authorization verifies tenant membership

---

### Requirement: Event Debouncing
The system SHALL debounce rapid successive updates to the same entity.

#### Scenario: Debounce rapid task updates
- **WHEN** a task is updated 5 times within 100ms
- **THEN** only 1 TaskUpdated event is broadcast
- **AND** contains the final state and all cumulative changes

---

### Requirement: Polling Fallback Endpoint
The system SHALL provide a REST endpoint for polling updates when WebSockets are unavailable.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/boards/{board}/updates | Get recent events |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| since | ISO 8601 timestamp | Return events after this time |
| limit | integer | Max events (default 50) |

**Response:**
```json
{
  "events": [
    { "event": "task.updated", "timestamp": "...", "data": {...} },
    { "event": "task.created", "timestamp": "...", "data": {...} }
  ],
  "sync_token": "2024-01-15T10:30:00Z",
  "has_more": false
}
```

#### Scenario: Poll for updates
- **WHEN** WebSocket connection fails
- **THEN** client falls back to polling this endpoint
- **AND** uses sync_token for next request

#### Scenario: No updates since timestamp
- **WHEN** no events occurred since provided timestamp
- **THEN** empty events array is returned
- **AND** sync_token is current time
